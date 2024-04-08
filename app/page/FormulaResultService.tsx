import { useContext } from 'react';
import { Page } from '../lib/definitions';
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

  async function getFormulaOutputs(formulas: Set<string>, pages: Page[]): Promise<Map<string, FormulaOutput>> {
    const promises = Array.from(formulas).map(async (formula) => {
      const output = await getFormulaOutput(formula, pages);
      return [formula, output] as [string, FormulaOutput];
    });
  
    const results = await Promise.all(promises);
    return new Map(results);
  }

  const updatePagesResults = async (pageNames: Set<string>): Promise<void> => {
    
    const pagesToQuery = pages.filter((page) => pageNames.has(page.title));

    setSharedNodeMap((prevMap) => {
      
      let updatedMap = new Map(prevMap);
      const formulas = new Set<string>();

      // Delete current results for the page while collecting all the formulas
      for (const [key] of updatedMap.entries()) {
        const pageName = key.split("-")[0];
        for (const query of updatedMap.get(key)?.queries??[]) {
          formulas.add(query);
        }
        if (pageNames.has(pageName)) updatedMap.delete(key);
      }
  
      // run all the formulas over the updated pages and add to the shared node map
      getFormulaOutputs(formulas, pagesToQuery)
        .then((outputMap) => {
          outputMap.forEach(( formulaOutput, formula ) => {
            if (formulaOutput && formulaOutput.type === FormulaOutputType.NodeMarkdown) {
              const resultNodes = formulaOutput.output as NodeMarkdown[];
              updatedMap = mergeResults(resultNodes, formula, updatedMap);
            }
          });
        })
        .catch((error) => {
          console.error("Error:", error);
        });
  
      return updatedMap;
    });
  };
  
  return {
    getFormulaResults,
    updatePagesResults
  }
};