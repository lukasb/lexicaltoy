import React, { createContext, useContext, useState, useCallback } from 'react';
import { Page } from '@/lib/definitions';
import { getBlockIdFromMarkdown } from '@/lib/blockref';

type BlockIdMap = Map<string, string[]>;

interface BlockIdsIndexContextType {
  setBlockIdsForPage: (pageTitle: string, blockIds: string[]) => void;
  getBlockIdsForPage: (pageTitle: string) => string[] | undefined;
  getPagesWithBlockIds: () => string[];
}

const BlockIdsIndexContext = createContext<BlockIdsIndexContextType | undefined>(undefined);

export const BlockIdsIndexProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [blockIdMap, setBlockIdMap] = useState<BlockIdMap>(new Map());

  const setBlockIdsForPage = useCallback((pageTitle: string, blockIds: string[]) => {
    setBlockIdMap(prevMap => {
      const newMap = new Map(prevMap);
      if (blockIds.length === 0) {
        // Remove the page title if an empty list is passed
        newMap.delete(pageTitle);
      } else {
        // Set or update the block IDs for the page title
        newMap.set(pageTitle, blockIds);
      }
      return newMap;
    });
  }, []);

  const getBlockIdsForPage = useCallback((pageTitle: string) => {
    return blockIdMap.get(pageTitle);
  }, [blockIdMap]);

  const getPagesWithBlockIds = useCallback(() => {
    return Array.from(blockIdMap.keys());
  }, [blockIdMap]);

  const value = {
    setBlockIdsForPage,
    getBlockIdsForPage,
    getPagesWithBlockIds,
  };

  return (
    <BlockIdsIndexContext.Provider value={value}>
      {children}
    </BlockIdsIndexContext.Provider>
  );
};

export const useBlockIdsIndex = () => {
  const context = useContext(BlockIdsIndexContext);
  if (context === undefined) {
    throw new Error('useBlockIds must be used within a BlockIdProvider');
  }
  return context;
};

export function ingestPageBlockIds(pageTitle: string, pageValue: string, setBlockIdsForPage: (pageTitle: string, blockIds: string[]) => void) {
  const blockIds = new Set<string>();
  for (const line of pageValue.split("\n")) {
    const blockId = getBlockIdFromMarkdown(line);
    if (blockId) {
      blockIds.add(blockId);
    }
  }
  setBlockIdsForPage(pageTitle, Array.from(blockIds));
}

