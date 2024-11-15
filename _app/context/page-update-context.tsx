import React, { createContext, useContext, useState, useCallback } from 'react';
import { Page, PageStatus } from '@/lib/definitions';

// Define the type for our map values
type PageUpdateInfo = {
  status: PageStatus;
  lastModified?: Date;
  newValue?: string;
}

// Create the context
export type PageUpdateContextType = {
  pageUpdates: Map<string, PageUpdateInfo>;
  addPageUpdate: (pageId: string, status: PageStatus, lastModified?: Date, newValue?: string) => void;
  getPageUpdate: (pageId: string) => PageUpdateInfo | undefined;
  removePageUpdate: (pageId: string) => void;
  setPageUpdateStatus: (pageId: string, status: PageStatus) => void;
  getUpdatedPageValue: (page: Page) => string;
}

const PageUpdateContext = createContext<PageUpdateContextType | undefined>(undefined);

// Create the provider component
export function PageUpdateProvider({ children }: { children: React.ReactNode }) {
  const [pageUpdates, setPageUpdates] = useState<Map<string, PageUpdateInfo>>(
    new Map()
  );

  const addPageUpdate = (pageId: string, status: PageStatus, lastModified?: Date, newValue?: string) => {
    if (status !== PageStatus.DroppingUpdate && status !== PageStatus.Conflict && (!lastModified || !newValue)) {
      throw new Error("lastModified and newValue are required for non-dropping updates");
    }
    setPageUpdates(prevMap => {
      const newMap = new Map(prevMap);
      newMap.set(pageId, {
        status,
        lastModified: lastModified || prevMap.get(pageId)?.lastModified || new Date(new Date().toISOString()),
        newValue
      });
      return newMap;
    });
  };

  const getPageUpdate = useCallback((pageId: string) => {
    return pageUpdates.get(pageId);
  }, [pageUpdates]);

  const removePageUpdate = (pageId: string) => {
    setPageUpdates(prevMap => {
      const newMap = new Map(prevMap);
      newMap.delete(pageId);
      return newMap;
    });
  };

  const setPageUpdateStatus = (pageId: string, status: PageStatus) => {
    setPageUpdates(prevMap => {
      const newMap = new Map(prevMap);
      const existingUpdate = newMap.get(pageId);
      if (existingUpdate) {
        newMap.set(pageId, {
          ...existingUpdate,
          status,
          lastModified: new Date(new Date().toISOString())
        });
      } else {
        throw new Error("Tried to update status for page without existing update");
      }
      return newMap;
    });
  };

  const getUpdatedPageValue = useCallback((page: Page) => {
    const pageUpdate = pageUpdates.get(page.id);
    return pageUpdate?.newValue || page.value;
  }, [pageUpdates]);

  return (
    <PageUpdateContext.Provider 
      value={{ 
        pageUpdates: pageUpdates, 
        addPageUpdate: addPageUpdate, 
        getPageUpdate: getPageUpdate, 
        removePageUpdate: removePageUpdate,
        setPageUpdateStatus: setPageUpdateStatus,
        getUpdatedPageValue: getUpdatedPageValue
      }}
    >
      {children}
    </PageUpdateContext.Provider>
  );
}

// Custom hook to use the page status context
export function usePageUpdate() {
  const context = useContext(PageUpdateContext);
  if (context === undefined) {
    throw new Error('usePageStatus must be used within a PageStatusProvider');
  }
  return context;
}