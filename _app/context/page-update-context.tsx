import React, { createContext, useContext, useState, useCallback } from 'react';
import { Page, PageStatus } from '@/lib/definitions';

type PageStatusInfo = {
  status: PageStatus;
  lastModified: Date;
  revisionNumber: number;
  newValue?: string;
  newTitle?: string;
}

export type PageStatusContextType = {
  pageStatuses: Map<string, PageStatusInfo>;
  addPageStatus: (pageId: string, status: PageStatus, lastModified: Date, revisionNumber: number, newValue?: string, newTitle?: string) => void;
  getPageStatus: (pageId: string) => PageStatusInfo | undefined;
  removePageStatus: (pageId: string) => void;
  setPageStatus: (pageId: string, status: PageStatus, lastModified?: Date, revisionNumber?: number, newValue?: string, newTitle?: string) => void;
  getUpdatedPageValue: (page: Page) => string;
  setPageLastModified: (pageId: string, lastModified: Date) => void;
  setPageRevisionNumber: (pageId: string, revisionNumber: number) => void;
}

const PageStatusContext = createContext<PageStatusContextType | undefined>(undefined);

export function PageStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageStatuses, setPageStatuses] = useState<Map<string, PageStatusInfo>>(
    new Map()
  );

  // Memoize all functions to prevent unnecessary recreations
  const addPageStatus = useCallback((
    pageId: string,
    status: PageStatus,
    lastModified: Date,
    revisionNumber: number,
    newValue?: string,
    newTitle?: string
  ) => {
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
    setPageStatuses((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(pageId, {
        status,
        lastModified,
        revisionNumber,
        newValue,
        newTitle,
      });
      return newMap;
    });
  }, []);

  const getPageStatus = useCallback(
    (pageId: string) => pageStatuses.get(pageId),
    [pageStatuses]
  );

  const removePageStatus = useCallback((pageId: string) => {
    setPageStatuses((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.delete(pageId);
      return newMap;
    });
  }, []);

  const setPageStatus = useCallback((pageId: string, status: PageStatus, lastModified?: Date, revisionNumber?: number, newValue?: string, newTitle?: string) => {
    setPageStatuses((prevMap) => {
      const newMap = new Map(prevMap);
      const existingUpdate = newMap.get(pageId);
      if (existingUpdate) {
        if (
          status !== PageStatus.DroppingUpdate &&
          status !== PageStatus.EditorUpdateRequested &&
          status !== PageStatus.Conflict &&
          status !== PageStatus.Quiescent &&
          (newValue === undefined && newTitle === undefined && existingUpdate.newValue === undefined && existingUpdate.newTitle === undefined)
        ) {
          throw new Error(
            `lastModified and either newValue or newTitle are required for status of type ${status}`
          );
        } else if (existingUpdate.status === PageStatus.Conflict && status !== PageStatus.DroppingUpdate) {
          throw new Error("Cannot update a conflict page to a non-dropping update status");
        }
        newMap.set(pageId, {
          ...existingUpdate,
          status,
          lastModified: lastModified || existingUpdate.lastModified,
          revisionNumber: revisionNumber || existingUpdate.revisionNumber,
          newValue: status === PageStatus.DroppingUpdate ? undefined : (newValue || existingUpdate.newValue),
          newTitle: status === PageStatus.DroppingUpdate ? undefined : (newTitle || existingUpdate.newTitle),
        });
      } else {
        throw new Error(
          "Tried to update status for page without existing update"
        );
      }
      return newMap;
    });
  }, []);

  const getUpdatedPageValue = useCallback(
    (page: Page) => {
      const pageStatus = pageStatuses.get(page.id);
      return pageStatus?.newValue || page.value;
    },
    [pageStatuses]
  );

  const setPageLastModified = useCallback((pageId: string, lastModified: Date) => {
    setPageStatuses((prevMap) => {
      const newMap = new Map(prevMap);
      const existingUpdate = newMap.get(pageId);
      if (existingUpdate && existingUpdate.status) {
        newMap.set(pageId, {
          ...existingUpdate,
          lastModified
        });
      }
      return newMap;
    });
  }, []);

  const setPageRevisionNumber = useCallback((pageId: string, revisionNumber: number) => {
    setPageStatuses((prevMap) => {
      const newMap = new Map(prevMap);
      const existingUpdate = newMap.get(pageId);
      if (existingUpdate) {
        newMap.set(pageId, {
          ...existingUpdate,
          revisionNumber
        });
      }
      return newMap;
    });
  }, []);

  // Memoize the context value to prevent unnecessary rerenders of consumers
  const contextValue = React.useMemo(() => ({
    pageStatuses,
    addPageStatus,
    getPageStatus,
    removePageStatus,
    setPageStatus,
    getUpdatedPageValue,
    setPageLastModified,
    setPageRevisionNumber,
  }), [
    pageStatuses,
    addPageStatus,
    getPageStatus,
    removePageStatus,
    setPageStatus,
    getUpdatedPageValue,
    setPageLastModified,
    setPageRevisionNumber
  ]);

  return (
    <PageStatusContext.Provider value={contextValue}>
      {children}
    </PageStatusContext.Provider>
  );
}

export function usePageStatus() {
  const context = useContext(PageStatusContext);
  if (context === undefined) {
    throw new Error('usePageStatus must be used within a PageStatusProvider');
  }
  return context;
}