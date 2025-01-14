import React, { createContext, useContext, useReducer, useCallback } from 'react';
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

// Action types
type PageStatusAction =
  | { type: 'ADD_STATUS'; pageId: string; status: PageStatusInfo }
  | { type: 'REMOVE_STATUS'; pageId: string }
  | { type: 'UPDATE_STATUS'; pageId: string; updates: Partial<PageStatusInfo> }
  | { type: 'SET_LAST_MODIFIED'; pageId: string; lastModified: Date }
  | { type: 'SET_REVISION_NUMBER'; pageId: string; revisionNumber: number };

function pageStatusReducer(state: Map<string, PageStatusInfo>, action: PageStatusAction): Map<string, PageStatusInfo> {
  const newState = new Map(state);
  
  switch (action.type) {
    case 'ADD_STATUS':
      if (
        action.status.status !== PageStatus.DroppingUpdate &&
        action.status.status !== PageStatus.Conflict &&
        action.status.status !== PageStatus.Quiescent &&
        (action.status.newValue === undefined && action.status.newTitle === undefined)
      ) {
        throw new Error(
          `lastModified and either newValue or newTitle are required for status of type ${action.status.status}`
        );
      }
      newState.set(action.pageId, action.status);
      return newState;

    case 'REMOVE_STATUS':
      newState.delete(action.pageId);
      return newState;

    case 'UPDATE_STATUS': {
      const existing = newState.get(action.pageId);
      if (!existing) {
        throw new Error("Tried to update status for page without existing update");
      }
      
      const newStatus = action.updates.status || existing.status;
      if (existing.status === PageStatus.Conflict && newStatus !== PageStatus.DroppingUpdate) {
        throw new Error("Cannot update a conflict page to a non-dropping update status");
      }

      if (
        newStatus !== PageStatus.DroppingUpdate &&
        newStatus !== PageStatus.EditorUpdateRequested &&
        newStatus !== PageStatus.Conflict &&
        newStatus !== PageStatus.Quiescent &&
        (action.updates.newValue === undefined && action.updates.newTitle === undefined && existing.newValue === undefined && existing.newTitle === undefined)
      ) {
        throw new Error(
          `lastModified and either newValue or newTitle are required for status of type ${newStatus}`
        );
      }

      newState.set(action.pageId, {
        ...existing,
        ...action.updates,
        newValue: newStatus === PageStatus.DroppingUpdate ? undefined : (action.updates.newValue || existing.newValue),
        newTitle: newStatus === PageStatus.DroppingUpdate ? undefined : (action.updates.newTitle || existing.newTitle),
      });
      return newState;
    }

    case 'SET_LAST_MODIFIED': {
      const existing = newState.get(action.pageId);
      if (existing && existing.status) {
        newState.set(action.pageId, {
          ...existing,
          lastModified: action.lastModified
        });
      }
      return newState;
    }

    case 'SET_REVISION_NUMBER': {
      const existing = newState.get(action.pageId);
      if (existing) {
        newState.set(action.pageId, {
          ...existing,
          revisionNumber: action.revisionNumber
        });
      }
      return newState;
    }

    default:
      return state;
  }
}

export function PageStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageStatuses, dispatch] = useReducer(pageStatusReducer, new Map());

  const addPageStatus = useCallback((
    pageId: string,
    status: PageStatus,
    lastModified: Date,
    revisionNumber: number,
    newValue?: string,
    newTitle?: string
  ) => {
    dispatch({
      type: 'ADD_STATUS',
      pageId,
      status: { status, lastModified, revisionNumber, newValue, newTitle }
    });
  }, []);

  const getPageStatus = useCallback(
    (pageId: string) => pageStatuses.get(pageId),
    [pageStatuses]
  );

  const removePageStatus = useCallback((pageId: string) => {
    dispatch({ type: 'REMOVE_STATUS', pageId });
  }, []);

  const setPageStatus = useCallback((
    pageId: string,
    status: PageStatus,
    lastModified?: Date,
    revisionNumber?: number,
    newValue?: string,
    newTitle?: string
  ) => {
    dispatch({
      type: 'UPDATE_STATUS',
      pageId,
      updates: {
        status,
        ...(lastModified && { lastModified }),
        ...(revisionNumber && { revisionNumber }),
        ...(newValue && { newValue }),
        ...(newTitle && { newTitle })
      }
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
    dispatch({ type: 'SET_LAST_MODIFIED', pageId, lastModified });
  }, []);

  const setPageRevisionNumber = useCallback((pageId: string, revisionNumber: number) => {
    dispatch({ type: 'SET_REVISION_NUMBER', pageId, revisionNumber });
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