import { useContext } from 'react';
import { 
  useSharedNodeContext,
  createSharedNodeKey
} from '@/app/context/shared-node-context';
import { getFormulaOutput } from '@/app/lib/formula/FormulaOutput';
import { PagesContext } from '@/app/context/pages-context';
import { NodeMarkdown, FormulaOutput, FormulaOutputType } from '@/app/lib/formula/formula-definitions';

export const useFormulaResultService = () => {
  const { sharedNodeMap, setSharedNodeMap } = useSharedNodeContext();
  const pages = useContext(PagesContext);

  const getFormulaResults = async (query: string): Promise<FormulaOutput | null> => {

    console.log("getting formula results", query);

    // Perform the query and fetch the results
    const output = await getFormulaOutput(query, pages);

    if (!output) return null;

    if (output.type === FormulaOutputType.NodeMarkdown) {
      const resultNodes = output.output as NodeMarkdown[];

      // TODO maybe only update the map if things have actually changed

      setSharedNodeMap((prevMap) => {
        const updatedMap = new Map(prevMap);
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
      });
    }

    return output;
  };

  const invalidatePageResults = (pageName: string) => {

    setSharedNodeMap((prevMap) => {
      const updatedMap = new Map(prevMap);
      for (const [key, value] of updatedMap.entries()) {
        if (key.startsWith(`${pageName}-`)) {
          updatedMap.delete(key);
        }
      }
      return updatedMap;
    });
  };

  return {
    getFormulaResults,
    invalidatePageResults,
  };
};