import React, { createContext, useContext, useState } from 'react';
import { PageStatus } from '@/lib/definitions';

// Define the type for our map values
type PageStatusInfo = {
  status: PageStatus;
  lastModified: Date;
}

// Create the context
type PageStatusContextType = {
  pageStatuses: Map<string, PageStatusInfo>;
  updatePageStatus: (pageId: string, status: PageStatus) => void;
  getPageStatus: (pageId: string) => PageStatusInfo | undefined;
  removePageStatus: (pageId: string) => void;
}

const PageStatusContext = createContext<PageStatusContextType | undefined>(undefined);

// Create the provider component
export function PageStatusProvider({ children }: { children: React.ReactNode }) {
  const [pageStatuses, setPageStatuses] = useState<Map<string, PageStatusInfo>>(
    new Map()
  );

  const updatePageStatus = (pageId: string, status: PageStatus, lastModified?: Date) => {
    setPageStatuses(prevMap => {
      const newMap = new Map(prevMap);
      newMap.set(pageId, {
        status,
        lastModified: lastModified || prevMap.get(pageId)?.lastModified || new Date(new Date().toISOString())
      });
      return newMap;
    });
  };

  const getPageStatus = (pageId: string) => {
    return pageStatuses.get(pageId);
  };

  const removePageStatus = (pageId: string) => {
    setPageStatuses(prevMap => {
      const newMap = new Map(prevMap);
      newMap.delete(pageId);
      return newMap;
    });
  };

  return (
    <PageStatusContext.Provider 
      value={{ 
        pageStatuses, 
        updatePageStatus, 
        getPageStatus, 
        removePageStatus 
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