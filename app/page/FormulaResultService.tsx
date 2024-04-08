import { useContext } from 'react';
import { 
  useSharedNodeContext,
  createSharedNodeKey,
  QueryNode
} from '@/app/context/shared-node-context';
import { getFormulaOutput } from '@/app/lib/formula/FormulaOutput';
import { PagesContext } from '@/app/context/pages-context';
import { NodeMarkdown, FormulaOutput, FormulaOutputType } from '@/app/lib/formula/formula-definitions';

export const useFormulaResultService = () => {
  const { sharedNodeMap, setSharedNodeMap } = useSharedNodeContext();
  const pages = useContext(PagesContext);

  const mergeResults = (resultNodes: NodeMarkdown[], query: string, nodeMap: Map<string, QueryNode>): Map<string, QueryNode> => {
    const updatedMap = new Map(nodeMap);
    resultNodes.forEach((result) => {
      const key = createSharedNodeKey(result.pageName, result.lineNumber);
      if (updatedMap.has(key)) {
        const mergedResult = updatedMap.get(key);
        if (mergedResult) {
          if (!mergedResult.queries.includes(query)) {
            mergedResult.queries.push(query);
          }
          mergedResult.output = result;
          updatedMap.set(key, mergedResult);
        }
      } else {
        const newQueryNode = { output: result, queries: [query] };
        updatedMap.set(key, newQueryNode);
      }
    });
    return updatedMap;
  }

  const getFormulaResults = async (query: string): Promise<FormulaOutput | null> => {

    // Perform the query and fetch the results
    const output = await getFormulaOutput(query, pages);

    if (!output) return null;

    if (output.type === FormulaOutputType.NodeMarkdown) {
      const resultNodes = output.output as NodeMarkdown[];

      // TODO maybe only update the map if things have actually changed

      setSharedNodeMap((prevMap) => {
        return mergeResults(resultNodes, query, prevMap);
      });
    }

    return output;
  };

  const updatePageResults = async (pageName: string, queries: string[]): Promise<void> => {
    
    const page = pages.find((p) => p.title === pageName);
    if (!page) return;
    
    // Fetch all the formula outputs first
    const queryOutputs = await Promise.all(queries.map(async (query) => {
      const output = await getFormulaOutput(query, [page]);
      // Return both the query and its output for further processing
      return { query, output };
    }));
  
    setSharedNodeMap((prevMap) => {
      let updatedMap = new Map(prevMap);
      
      // Delete current results for the page
      for (const [key] of updatedMap.entries()) {
        const pageKey = key.split("-")[0];
        if (pageKey === pageName) {
          updatedMap.delete(key);
        }
      }
  
      // Add the new results
      queryOutputs.forEach(({ query, output }) => {
        if (output && output.type === FormulaOutputType.NodeMarkdown) {
          const resultNodes = output.output as NodeMarkdown[];
          updatedMap = mergeResults(resultNodes, query, updatedMap);
        }
      });
  
      return updatedMap;
    });
  };
  
  return {
    getFormulaResults,
    updatePageResults
  }
};