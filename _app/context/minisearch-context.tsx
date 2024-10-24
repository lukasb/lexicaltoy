import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import MiniSearch from 'minisearch';
import { PagesContext } from '@/_app/context/pages-context';
import { Page } from '@/lib/definitions';

interface MiniSearchContextType {
  miniSearch: MiniSearch<Page> | null;
  msDiscardPage: (id: string) => void;
  msReplacePage: (page: Page) => void;
  msAddPage: (page: Page) => void;
}

const MiniSearchContext = createContext<MiniSearchContextType | null>(null);

export const useMiniSearch = () => {
  const context = useContext(MiniSearchContext);
  if (!context) {
    throw new Error('useMiniSearch must be used within a MiniSearchProvider');
  }
  return context;
};

export const MiniSearchProvider: React.FC<{ children: React.ReactNode, pages: Page[] }> = ({ children, pages }) => {
  const [miniSearch, setMiniSearch] = useState<MiniSearch<Page> | null>(null);
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
  };

  return (
    <MiniSearchContext.Provider value={contextValue}>
      {children}
    </MiniSearchContext.Provider>
  );
};