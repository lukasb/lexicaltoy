import React, { createContext, useContext, useState, useCallback } from 'react';
import { NodeMarkdown, NodeMarkdownSchema } from '@/lib/formula/formula-definitions';
import { z } from 'zod';

const QueryNodeSchema = z.object({
  output: NodeMarkdownSchema,
  queries: z.array(z.string()),
  needsSyncToPage: z.boolean().default(false)
});

export type QueryNode = z.infer<typeof QueryNodeSchema>;

type SharedNodeMap = Map<string, QueryNode>;

type SharedNodeContextType = {
  sharedNodeMap: SharedNodeMap;
  setSharedNodeMap: React.Dispatch<React.SetStateAction<SharedNodeMap>>;
  updateNodeMarkdown: (updatedNodeMarkdown: NodeMarkdown, needsSyncToPage: boolean) => void;
};

const SharedNodeContext = createContext<SharedNodeContextType>({
  sharedNodeMap: new Map(),
  setSharedNodeMap: () => {},
  updateNodeMarkdown: () => {},
});

export function createSharedNodeKey(pageName: string, lineNumberStart: number, lineNumberEnd: number): string {
  return `${pageName}-${lineNumberStart}-${lineNumberEnd}`;
}

export type SharedNodeKeyElements = {
  pageName: string;
  lineNumberStart: number;
  lineNumberEnd: number;
};

export function getSharedNodeKeyElements(key: string): SharedNodeKeyElements {
  const [pageName, lineNumberStart, lineNumberEnd] = key.split("-");
  return { pageName, lineNumberStart: parseInt(lineNumberStart), lineNumberEnd: parseInt(lineNumberEnd)};
}

export const useSharedNodeContext = () => useContext(SharedNodeContext);

type Props = {
  children: React.ReactNode;
};

export const SharedNodeProvider: React.FC<Props> = ({ children }) => {
  const [sharedNodeMap, setSharedNodeMap] = useState<SharedNodeMap>(new Map());

  const updateSharedNode = useCallback((updatedNodeMarkdown: NodeMarkdown, updatedNeedsSyncToPage: boolean) => {
    const key = createSharedNodeKey(
      updatedNodeMarkdown.pageName, updatedNodeMarkdown.lineNumberStart, updatedNodeMarkdown.lineNumberEnd);
    if (sharedNodeMap.get(key)?.output === updatedNodeMarkdown) return;
    setSharedNodeMap((prevMap) => {
      const existingNode = prevMap.get(key);
      const newNode: QueryNode = {
        output: updatedNodeMarkdown,
        queries: existingNode ? existingNode.queries : [],
        needsSyncToPage: updatedNeedsSyncToPage
      };
      return new Map(prevMap).set(key, newNode);
    });
  }, [sharedNodeMap]);

  return (
    <SharedNodeContext.Provider value={{ sharedNodeMap: sharedNodeMap, setSharedNodeMap: setSharedNodeMap, updateNodeMarkdown: updateSharedNode }}>
      {children}
    </SharedNodeContext.Provider>
  );
};