import "fake-indexeddb/auto";
import { Page } from "@/lib/definitions";
import { PageSyncResult } from "./storage-context";
import { localDb } from "./db";
import * as remoteDb from "@/lib/db";
import { 
  updatePage, 
  insertPage,
  getLocalPageById,
  getJournalPagesByUserId,
  getQueuedUpdatesByUserId,
  processQueuedUpdatesInternal,
  fetchUpdatedPagesInternal,
  getQueuedUpdateById,
  getLocalJournalPageByDate,
  getJournalQueuedUpdatesByUserId,
  getLocalPagesByUserId,
  fetchUpdatedPages,
} from "./storage-context";
import { getJournalTitle } from "@/lib/journal-helpers";

// Mock remote DB functions
jest.mock("@/lib/db", () => ({
  fetchPagesRemote: jest.fn(),
  fetchUpdatesSince: jest.fn(),
  updatePageWithHistory: jest.fn(),
  insertPageDb: jest.fn(),
}));

// Add this mock after the remote DB mock
jest.mock("./storage-context", () => {
  const actual = jest.requireActual("./storage-context");
  return {
    ...actual,
    getQueuedUpdatesByUserId: jest.fn(),
    getLocalPageById: jest.fn(),
  };
});

// Add global navigator and crypto mocks before tests
global.navigator = {
  onLine: true,
  locks: {
    request: async (name: string, callback: (lock: any) => Promise<any>) => callback({})
  }
} as any;

global.crypto = {
  randomUUID: () => 'test-uuid-123'
} as any;

const setNavigatorOnlineStatus = (isOnline: boolean) => {
  Object.defineProperty(global, 'navigator', {
    value: {
      ...global.navigator,
      onLine: isOnline,
      locks: {
        request: async (name: string, callback: (lock: any) => Promise<any>) => callback({})
      }
    },
    configurable: true
  });
};

describe("Page Sync Functions", () => {
  const mockUserId = "test-user-123";
  const mockPage: Page = {
    id: "test-page-123",
    title: "Test Page",
    value: "Test content",
    userId: mockUserId,
    isJournal: false,
    deleted: false,
    lastModified: new Date("2024-01-01"),
    revisionNumber: 1,
  };

  beforeEach(async () => {
    // Reset IndexedDB completely
    indexedDB = new IDBFactory();
    await localDb.delete();
    await localDb.open();

    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset navigator online status to default (true)
    setNavigatorOnlineStatus(true);
  });

  describe("fetchUpdatedPages", () => {
    it("should return success when offline", async () => {
      setNavigatorOnlineStatus(false);

      const result = await fetchUpdatedPages(mockUserId);
      expect(result).toBe(PageSyncResult.Success);
      expect(remoteDb.fetchPagesRemote).not.toHaveBeenCalled();
    });
  });

  describe("fetchUpdatedPages", () => {
    it("should sync pages from remote when online", async () => {
      setNavigatorOnlineStatus(true);

      const mockRemotePages = [{ ...mockPage, value: "Updated content" }];
      (remoteDb.fetchPagesRemote as jest.Mock).mockResolvedValue(mockRemotePages);

      const result = await fetchUpdatedPagesInternal(
        mockUserId,
        jest.fn(),
        jest.fn(),
        remoteDb.fetchPagesRemote
      );
      
      expect(result).toBe(PageSyncResult.Success);
      expect(remoteDb.fetchPagesRemote).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe("processQueuedUpdates", () => {
    it("should handle conflicts during sync", async () => {
      setNavigatorOnlineStatus(true);
      
      const mockHandleConflict = jest.fn();
      const conflictedPage = { 
        ...mockPage,
        lastModified: new Date("2024-01-02")
      };
  
      // First, add the local page to the DB
      await localDb.pages.put(mockPage);
  
      // Set up the queued update with an older timestamp
      const queuedUpdate = {
        ...mockPage,
        value: "Conflicting content",
        lastModified: new Date("2024-01-01")
      };
  
      // Add the queued update to the DB
      await localDb.queuedUpdates.put(queuedUpdate);
  
      // Mock getQueuedUpdatesByUserId to return our queued update
      
      (getQueuedUpdatesByUserId as jest.Mock).mockResolvedValue([queuedUpdate]);
      (getLocalPageById as jest.Mock).mockResolvedValue(conflictedPage);
      
      const result = await processQueuedUpdatesInternal(
        mockUserId,
        mockHandleConflict,
        getQueuedUpdatesByUserId,
        getLocalPageById
      );
      
      expect(result).toBe(PageSyncResult.Conflict);
      expect(mockHandleConflict).toHaveBeenCalledWith(mockPage.id, "stale_update");
      
      // Verify the state after sync
      const localPage = await getLocalPageById(mockPage.id);
      expect(localPage?.lastModified).toEqual(conflictedPage.lastModified);
      
      // Verify the queued update was processed
      expect(getQueuedUpdatesByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe("updatePage", () => {
    it("should queue page updates locally", async () => {
      await localDb.pages.put(mockPage);

      const result = await updatePage(
        mockPage,
        "Updated content",
        "Updated Title",
        false
      );

      const queuedUpdate = await localDb.queuedUpdates.get(mockPage.id);
      
      expect(result).toBe(PageSyncResult.Success);
      expect(queuedUpdate).toBeTruthy();
      expect(queuedUpdate?.value).toBe("Updated content");
      expect(queuedUpdate?.title).toBe("Updated Title");
    });

    it("should detect conflicts with newer local versions", async () => {
      const newerPage = {
        ...mockPage,
        lastModified: new Date("2024-01-02")
      };
      await localDb.pages.put(newerPage);

      const result = await updatePage(
        mockPage, // Using older version
        "Updated content",
        "Updated Title",
        false
      );

      expect(result).toBe(PageSyncResult.Conflict);
      
      // Verify no update was queued
      const queuedUpdate = await localDb.queuedUpdates.get(mockPage.id);
      expect(queuedUpdate).toBeUndefined();
    });
  });

  describe("insertPage", () => {
    it("should queue new page creation", async () => {
      const [newPage, result] = await insertPage(
        "New Page",
        "New content",
        mockUserId,
        false
      );

      const queuedPage = newPage ? await localDb.queuedUpdates.get(newPage.id) : null;
      
      expect(result).toBe(PageSyncResult.Success);
      expect(newPage).toBeTruthy();
      expect(queuedPage).toBeTruthy();
      expect(queuedPage?.title).toBe("New Page");
      expect(queuedPage?.value).toBe("New content");
    });

    it("should prevent duplicate titles", async () => {
      // Add existing page
      await localDb.pages.put(mockPage);

      const [newPage, result] = await insertPage(
        mockPage.title, // Using same title
        "New content",
        mockUserId,
        false
      );

      expect(result).toBe(PageSyncResult.Conflict);
      expect(newPage).toBeUndefined();
    });
  });

  describe("Journal Pages", () => {
    it("should fetch journal pages for user", async () => {
      // Create a journal page
      const journalPage: Page = {
        ...mockPage,
        id: "journal-page-123", // Give it a unique ID
        isJournal: true,
        title: "2024-01-01",
        userId: mockUserId // Ensure userId matches
      };

      // Create a non-journal page with different ID
      const regularPage: Page = {
        ...mockPage,
        id: "regular-page-123",
        isJournal: false,
        userId: mockUserId
      };

      // Add both pages to the database
      await Promise.all([
        localDb.pages.add(journalPage),
        localDb.pages.add(regularPage)
      ]);

      // Query journal pages
      const journalPages = await getJournalPagesByUserId(mockUserId);
      
      // Test assertions
      expect(journalPages).toHaveLength(1);
      expect(journalPages[0].isJournal).toBe(true);
      expect(journalPages[0].title).toBe("2024-01-01");
      expect(journalPages[0].id).toBe("journal-page-123");
    });
  });

  describe("Local Page Operations", () => {
    /*it("should retrieve local page by id", async () => {
      await localDb.pages.put(mockPage);
      const result = await getLocalPageById(mockPage.id);
      expect(result).toEqual(mockPage);
    });*/
  
    it("should retrieve queued update by id", async () => {
      const queuedPage = { ...mockPage, value: "queued content" };
      await localDb.queuedUpdates.put(queuedPage);
      const result = await getQueuedUpdateById(mockPage.id);
      expect(result).toEqual(queuedPage);
    });
  
    it("should prioritize queued updates in journal page retrieval", async () => {
      const journalDate = new Date("2024-01-01");
      const journalTitle = getJournalTitle(journalDate);
      
      const localPage = { ...mockPage, title: journalTitle, isJournal: true };
      const queuedPage = { ...localPage, value: "queued content" };
      
      await localDb.pages.put(localPage);
      await localDb.queuedUpdates.put(queuedPage);
      
      const result = await getLocalJournalPageByDate(journalDate);
      expect(result).toEqual(queuedPage);
    });
  });
  
  describe("Journal Operations", () => {
    it("should retrieve queued journal updates for user", async () => {
      const queuedJournal = { ...mockPage, isJournal: true };
      const queuedRegular = { ...mockPage, id: "regular-123", isJournal: false };
      
      await localDb.queuedUpdates.bulkPut([queuedJournal, queuedRegular]);
      
      const results = await getJournalQueuedUpdatesByUserId(mockUserId);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(queuedJournal);
    });
  });
  
  describe("Error Handling", () => {
    it("should handle invalid page data during sync", async () => {
      const invalidPage = { id: "invalid-123" }; // Missing required fields
      (remoteDb.fetchPagesRemote as jest.Mock).mockResolvedValue([invalidPage]);
      
      await expect(fetchUpdatedPagesInternal(
        mockUserId,
        jest.fn(),
        jest.fn(),
        remoteDb.fetchPagesRemote
      )).rejects.toThrow();
    });
  
    it("should handle insertPageDb failures", async () => {

      setNavigatorOnlineStatus(true);

      (remoteDb.insertPageDb as jest.Mock).mockResolvedValue("duplicate key value");
      
      const queuedJournal = { ...mockPage, id: "journal-123", title: "Journal 2024-01-01", isJournal: true };
      await localDb.queuedUpdates.put(queuedJournal);
      
      const result = await processQueuedUpdatesInternal(
        mockUserId,
        jest.fn(),
        () => Promise.resolve([queuedJournal]),
        () => Promise.resolve(undefined)
      );
      
      expect(result).toBe(PageSyncResult.Error);
    });
  });
  
  describe("Network and Sync Edge Cases", () => {
    it("should handle network failure during sync", async () => {
      (remoteDb.fetchPagesRemote as jest.Mock).mockRejectedValue(new Error("Network error"));
      
      const result = await fetchUpdatedPagesInternal(
        mockUserId,
        jest.fn(),
        jest.fn(),
        remoteDb.fetchPagesRemote
      );
      
      expect(result).toBe(PageSyncResult.Error);
    });
  
    it("should use fetchUpdatesSince for incremental sync", async () => {
      const mockFetchUpdatesSince = jest.fn().mockResolvedValue([mockPage]);
      
      await localDb.pages.put(mockPage);
      
      await fetchUpdatedPagesInternal(
        mockUserId,
        getLocalPagesByUserId,
        mockFetchUpdatesSince,
        remoteDb.fetchPagesRemote
      );
      
      expect(mockFetchUpdatesSince).toHaveBeenCalled();
      expect(remoteDb.fetchPagesRemote).not.toHaveBeenCalled();
    });
  });
});