import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import MiniSearch from 'minisearch';
import { Page } from '@/lib/definitions';

interface MiniSearchContextType {
  miniSearch: MiniSearch<Page> | null;
  msDiscardPage: (id: string) => void;
  msReplacePage: (page: Page) => void;
  msAddPage: (page: Page) => void;
  msSlurpPages: (pages: Page[]) => void;
}

const MiniSearchContext = createContext<MiniSearchContextType | null>(null);

export const useMiniSearch = () => {
  const context = useContext(MiniSearchContext);
  if (!context) {
    throw new Error('useMiniSearch must be used within a MiniSearchProvider');
  }
  return context;
};

export const MiniSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [miniSearch, setMiniSearch] = useState<MiniSearch<Page> | null>(null);
  const indexedRef = useRef(false);

  const initializeMiniSearch = useCallback((pages?: Page[]) => {
    if (indexedRef.current) return miniSearch;
    const ms = new MiniSearch<Page>({
      fields: ['title', 'value'],
      storeFields: ['title', 'value'],
    });
    //if (pages) ms.addAll(pages);
    setMiniSearch(ms);
    indexedRef.current = true;
    return ms;
  }, [miniSearch]);

  useEffect(() => {
    initializeMiniSearch();
  }, [initializeMiniSearch]);

  const slurpPages = useCallback((pages: Page[]) => {
    if (miniSearch) {
      miniSearch.addAll(pages);
    } else {
      const ms = initializeMiniSearch(pages);
      if (ms) ms.addAll(pages);
    }
  }, [initializeMiniSearch, miniSearch]);

  const discardPage = useCallback((id: string) => {
    if (miniSearch) {
      try {
        miniSearch.discard(id);
      } catch (error) {
        console.error("Error discarding page from MiniSearch", error);
      }
    }
  }, [miniSearch]);

  const replacePage = useCallback((page: Page) => {
    if (miniSearch) {
      try {
        miniSearch.replace(page);
      } catch (error) {
        console.error("Error replacing page in MiniSearch", error);
      }
    }
  }, [miniSearch]);

  const addPage = useCallback((page: Page) => {
    if (miniSearch) {
      try {
        miniSearch.add(page);
      } catch (error) {
        console.error("Error adding page to MiniSearch", error);
      }
    }
  }, [miniSearch]);

  const contextValue: MiniSearchContextType = {
    miniSearch,
    msDiscardPage: discardPage,
    msReplacePage: replacePage,
    msAddPage: addPage,
    msSlurpPages: slurpPages,
  };

  return (
    <MiniSearchContext.Provider value={contextValue}>
      {children}
    </MiniSearchContext.Provider>
  );
};