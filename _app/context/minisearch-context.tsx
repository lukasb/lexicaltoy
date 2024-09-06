import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import MiniSearch from 'minisearch';
import { PagesContext } from '@/_app/context/pages-context';
import { Page } from '@/lib/definitions';

interface MiniSearchContextType {
  miniSearch: MiniSearch<Page> | null;
  discardPage: (id: string) => void;
  replacePage: (page: Page) => void;
  addPage: (page: Page) => void;
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
  const pages = useContext(PagesContext);
  const indexedRef = useRef(false);

  useEffect(() => {
    if (indexedRef.current) return;

    const ms = new MiniSearch<Page>({
      fields: ['title', 'value'],
      storeFields: ['title', 'value'],
    });

    if (pages) {
      const pageArray = Object.values(pages);
      ms.addAll(pageArray);
      indexedRef.current = true;
    }

    setMiniSearch(ms);
  }, [pages]);

  const discardPage = useCallback((id: string) => {
    if (miniSearch) {
      miniSearch.discard(id);
    }
  }, [miniSearch]);

  const replacePage = useCallback((page: Page) => {
    if (miniSearch) {
      miniSearch.replace(page);
    }
  }, [miniSearch]);

  const addPage = useCallback((page: Page) => {
    if (miniSearch) {
      miniSearch.add(page);
    }
  }, [miniSearch]);

  const contextValue: MiniSearchContextType = {
    miniSearch,
    discardPage,
    replacePage,
    addPage,
  };

  return (
    <MiniSearchContext.Provider value={contextValue}>
      {children}
    </MiniSearchContext.Provider>
  );
};