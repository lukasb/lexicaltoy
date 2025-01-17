import { create } from 'zustand';
import { Page, PageStatus } from '@/lib/definitions';

type PageStatusInfo = {
  status: PageStatus;
  lastModified: Date;
  revisionNumber: number;
  newValue?: string;
  newTitle?: string;
}

export type PageStatusState = {
  pageStatuses: Map<string, PageStatusInfo>;
  addPageStatus: (pageId: string, status: PageStatus, lastModified: Date, revisionNumber: number, newValue?: string, newTitle?: string) => void;
  getPageStatus: (pageId: string) => PageStatusInfo | undefined;
  removePageStatus: (pageId: string) => void;
  setPageStatus: (pageId: string, status: PageStatus, lastModified?: Date, revisionNumber?: number, newValue?: string, newTitle?: string) => void;
  getUpdatedPageValue: (page: Page) => string;
  setPageLastModified: (pageId: string, lastModified: Date) => void;
  setPageRevisionNumber: (pageId: string, revisionNumber: number) => void;
}

export const usePageStatusStore = create<PageStatusState>((set, get) => ({
  pageStatuses: new Map(),

  addPageStatus: (pageId, status, lastModified, revisionNumber, newValue, newTitle) => {
    if (
      status !== PageStatus.DroppingUpdate &&
      status !== PageStatus.Conflict &&
      status !== PageStatus.Quiescent &&
      (newValue === undefined && newTitle === undefined)
    ) {
      throw new Error(
        `lastModified and either newValue or newTitle are required for status of type ${status}`
      );
    }

    set((state) => {
      const newPageStatuses = new Map(state.pageStatuses);
      newPageStatuses.set(pageId, { status, lastModified, revisionNumber, newValue, newTitle });
      return { pageStatuses: newPageStatuses };
    });
  },

  getPageStatus: (pageId) => {
    return get().pageStatuses.get(pageId);
  },

  removePageStatus: (pageId) => {
    set((state) => {
      const newPageStatuses = new Map(state.pageStatuses);
      newPageStatuses.delete(pageId);
      return { pageStatuses: newPageStatuses };
    });
  },

  setPageStatus: (pageId, status, lastModified, revisionNumber, newValue, newTitle) => {
    set((state) => {
      const newPageStatuses = new Map(state.pageStatuses);
      const existing = newPageStatuses.get(pageId);
      
      if (!existing) {
        throw new Error("Tried to update status for page without existing update");
      }

      if (existing.status === PageStatus.Conflict && status !== PageStatus.DroppingUpdate) {
        throw new Error("Cannot update a conflict page to a non-dropping update status");
      }

      if (
        status !== PageStatus.DroppingUpdate &&
        status !== PageStatus.EditorUpdateRequested &&
        status !== PageStatus.Conflict &&
        status !== PageStatus.Quiescent &&
        (newValue === undefined && newTitle === undefined && existing.newValue === undefined && existing.newTitle === undefined)
      ) {
        throw new Error(
          `lastModified and either newValue or newTitle are required for status of type ${status}`
        );
      }

      newPageStatuses.set(pageId, {
        ...existing,
        status,
        ...(lastModified && { lastModified }),
        ...(revisionNumber && { revisionNumber }),
        newValue: status === PageStatus.DroppingUpdate ? undefined : (newValue || existing.newValue),
        newTitle: status === PageStatus.DroppingUpdate ? undefined : (newTitle || existing.newTitle),
      });

      return { pageStatuses: newPageStatuses };
    });
  },

  getUpdatedPageValue: (page) => {
    const pageStatus = get().pageStatuses.get(page.id);
    return pageStatus?.newValue || page.value;
  },

  setPageLastModified: (pageId, lastModified) => {
    set((state) => {
      const newPageStatuses = new Map(state.pageStatuses);
      const existing = newPageStatuses.get(pageId);
      if (existing && existing.status) {
        newPageStatuses.set(pageId, {
          ...existing,
          lastModified
        });
      }
      return { pageStatuses: newPageStatuses };
    });
  },

  setPageRevisionNumber: (pageId, revisionNumber) => {
    set((state) => {
      const newPageStatuses = new Map(state.pageStatuses);
      const existing = newPageStatuses.get(pageId);
      if (existing) {
        newPageStatuses.set(pageId, {
          ...existing,
          revisionNumber
        });
      }
      return { pageStatuses: newPageStatuses };
    });
  },
})); 