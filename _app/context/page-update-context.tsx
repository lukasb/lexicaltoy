import React, { createContext, useContext, useState, useCallback } from 'react';
import { Page, PageStatus } from '@/lib/definitions';

// Define the type for our map values
type PageStatusInfo = {
  status: PageStatus;
  lastModified?: Date;
  newValue?: string;
}

// Create the context
export type PageStatusContextType = {
  pageStatuses: Map<string, PageStatusInfo>;
  addPageStatus: (pageId: string, status: PageStatus, lastModified?: Date, newValue?: string) => void;
  getPageStatus: (pageId: string) => PageStatusInfo | undefined;
  removePageStatus: (pageId: string) => void;
  setPageStatus: (pageId: string, status: PageStatus) => void;
  getUpdatedPageValue: (page: Page) => string;
}

const PageStatusContext = createContext<PageStatusContextType | undefined>(undefined);

// Create the provider component
export function PageStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageStatuses, setPageStatuses] = useState<Map<string, PageStatusInfo>>(
    new Map()
  );

  const addPageStatus = (
    pageId: string,
    status: PageStatus,
    lastModified?: Date,
    newValue?: string
  ) => {
    if (
      status !== PageStatus.DroppingUpdate &&
      status !== PageStatus.Conflict &&
      status !== PageStatus.Quiescent &&
      (!lastModified || newValue === undefined)
    ) {
      throw new Error(
        `lastModified and newValue are required for status of type ${status}`
      );
    }
    setPageStatuses((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(pageId, {
        status,
        lastModified:
          lastModified ||
          prevMap.get(pageId)?.lastModified ||
          new Date(new Date().toISOString()),
        newValue,
      });
      return newMap;
    });
  };

  const getPageStatus = useCallback(
    (pageId: string) => {
      return pageStatuses.get(pageId);
    },
    [pageStatuses]
  );

  const removePageStatus = (pageId: string) => {
    setPageStatuses((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.delete(pageId);
      return newMap;
    });
  };

  const setPageStatus = (pageId: string, status: PageStatus) => {
    setPageStatuses((prevMap) => {
      const newMap = new Map(prevMap);
      const existingUpdate = newMap.get(pageId);
      if (existingUpdate) {
        newMap.set(pageId, {
          ...existingUpdate,
          status,
          lastModified: new Date(new Date().toISOString()),
        });
      } else {
        throw new Error(
          "Tried to update status for page without existing update"
        );
      }
      return newMap;
    });
  };

  const getUpdatedPageValue = useCallback(
    (page: Page) => {
      const pageStatus = pageStatuses.get(page.id);
      return pageStatus?.newValue || page.value;
    },
    [pageStatuses]
  );

  return (
    <PageStatusContext.Provider
      value={{
        pageStatuses: pageStatuses,
        addPageStatus: addPageStatus,
        getPageStatus: getPageStatus,
        removePageStatus: removePageStatus,
        setPageStatus: setPageStatus,
        getUpdatedPageValue: getUpdatedPageValue,
      }}
    >
      {children}
    </PageStatusContext.Provider>
  );
}

// Custom hook to use the page status context
export function usePageStatus() {
  const context = useContext(PageStatusContext);
  if (context === undefined) {
    throw new Error('usePageStatus must be used within a PageStatusProvider');
  }
  return context;
}