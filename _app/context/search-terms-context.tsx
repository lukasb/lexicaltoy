import React, { createContext, useContext, useState, ReactNode } from 'react';

type SearchTermsMap = {
  [pageId: string]: string[];
};

interface SearchTermsContextType {
  searchTermsMap: SearchTermsMap;
  setSearchTerms: (pageId: string, searchString: string) => void;
  getSearchTerms: (pageId: string) => string[];
  deleteSearchTerms: (pageId: string) => void;
}

const SearchTermsContext = createContext<SearchTermsContextType | undefined>(undefined);

export const useSearchTerms = () => {
  const context = useContext(SearchTermsContext);
  if (context === undefined) {
    throw new Error('useSearchTerms must be used within a SearchTermsProvider');
  }
  return context;
};

interface SearchTermsProviderProps {
  children: ReactNode;
}

export const SearchTermsProvider: React.FC<SearchTermsProviderProps> = ({ children }) => {
  const [searchTermsMap, setSearchTermsMap] = useState<SearchTermsMap>({});

  const setSearchTerms = (pageId: string, searchString: string) => {
    const terms = searchString.split(' ').filter(term => term.trim() !== '');
    setSearchTermsMap(prevMap => ({
      ...prevMap,
      [pageId]: terms
    }));
  };

  const getSearchTerms = (pageId: string): string[] => {
    return searchTermsMap[pageId] || [];
  };

  const deleteSearchTerms = (pageId: string) => {
    setSearchTermsMap(prevMap => {
      if (!(pageId in prevMap)) {
        return prevMap;
      }
      const newMap = { ...prevMap };
      delete newMap[pageId];
      return newMap;
    });
  };

  return (
    <SearchTermsContext.Provider value={{ searchTermsMap, setSearchTerms, getSearchTerms, deleteSearchTerms }}>
      {children}
    </SearchTermsContext.Provider>
  );
};