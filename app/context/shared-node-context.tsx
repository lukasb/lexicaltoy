import React, { createContext, useContext, useState, useCallback } from 'react';
import { NodeMarkdown, NodeMarkdownSchema } from '@/app/lib/formula/formula-definitions';
import { z } from 'zod';

const QueryNodeSchema = z.object({
  output: NodeMarkdownSchema,
  queries: z.array(z.string())
});

export type QueryNode = z.infer<typeof QueryNodeSchema>;

type SharedNodeMap = Map<string, QueryNode>;

type SharedNodeContextType = {
  sharedNodeMap: SharedNodeMap;
  setSharedNodeMap: React.Dispatch<React.SetStateAction<SharedNodeMap>>;
  updateNodeMarkdown: (updatedNodeMarkdown: NodeMarkdown) => void;
};

const SharedNodeContext = createContext<SharedNodeContextType>({
  sharedNodeMap: new Map(),
  setSharedNodeMap: () => {},
  updateNodeMarkdown: () => {},
});

export function createSharedNodeKey(pageName: string, lineNumber: number): string {
  return `${pageName}-${lineNumber}`;
}

export const useSharedNodeContext = () => useContext(SharedNodeContext);

type Props = {
  children: React.ReactNode;
};

export const SharedNodeProvider: React.FC<Props> = ({ children }) => {
  const [sharedNodeMap, setSharedNodeMap] = useState<SharedNodeMap>(new Map());

  const updateSharedNode = useCallback((updatedNodeMarkdown: NodeMarkdown) => {
    const key = createSharedNodeKey(updatedNodeMarkdown.pageName, updatedNodeMarkdown.lineNumber);
    if (sharedNodeMap.get(key)?.output === updatedNodeMarkdown) return;
    setSharedNodeMap((prevMap) => {
      const existingNode = prevMap.get(key);
      const newNode: QueryNode = {
        output: updatedNodeMarkdown,
        queries: existingNode ? existingNode.queries : [],
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