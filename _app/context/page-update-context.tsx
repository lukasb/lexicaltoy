import React, { createContext, useContext, useState } from 'react';
import { PageStatus } from '@/lib/definitions';

// Define the type for our map values
type PageUpdateInfo = {
  status: PageStatus;
  lastModified: Date;
  newValue: string;
}

// Create the context
type PageUpdateContextType = {
  pageUpdates: Map<string, PageUpdateInfo>;
  addPageUpdate: (pageId: string, status: PageStatus, lastModified: Date, newValue: string) => void;
  getPageUpdate: (pageId: string) => PageUpdateInfo | undefined;
  removePageUpdate: (pageId: string) => void;
  setPageUpdateStatus: (pageId: string, status: PageStatus) => void;
}

const PageUpdateContext = createContext<PageUpdateContextType | undefined>(undefined);

// Create the provider component
export function PageUpdateProvider({ children }: { children: React.ReactNode }) {
  const [pageUpdates, setPageUpdates] = useState<Map<string, PageUpdateInfo>>(
    new Map()
  );

  const addPageUpdate = (pageId: string, status: PageStatus, lastModified: Date, newValue: string) => {
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

  const getPageUpdate = (pageId: string) => {
    return pageUpdates.get(pageId);
  };

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
      }
      return newMap;
    });
  };

  return (
    <PageUpdateContext.Provider 
      value={{ 
        pageUpdates: pageUpdates, 
        addPageUpdate: addPageUpdate, 
        getPageUpdate: getPageUpdate, 
        removePageUpdate: removePageUpdate,
        setPageUpdateStatus: setPageUpdateStatus 
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