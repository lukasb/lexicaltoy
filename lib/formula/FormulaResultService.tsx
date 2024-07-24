import { useContext } from 'react';
import { Page } from '@/lib/definitions';
import { 
  useSharedNodeContext,
  createSharedNodeKey,
  QueryNode,
  SharedNodeKeyElements,
  getSharedNodeKeyElements
} from '@/_app/context/shared-node-context';
import { getFormulaOutput } from '@/lib/formula/FormulaOutput';
import { PagesContext } from '@/_app/context/pages-context';
import { NodeMarkdown, FormulaOutput, FormulaOutputType } from '@/lib/formula/formula-definitions';
import { DialogueElement } from '../ai';

export const useFormulaResultService = () => {
  const { sharedNodeMap, setSharedNodeMap } = useSharedNodeContext();
  const pages = useContext(PagesContext);

  const mergeResults = (resultNodes: NodeMarkdown[], query: string, nodeMap: Map<string, QueryNode>, updatedNeedsSyncToPage: boolean): Map<string, QueryNode> => {
    const updatedMap = new Map(nodeMap);
    resultNodes.forEach((result) => {
      const key = createSharedNodeKey(result.pageName, result.lineNumberStart, result.lineNumberEnd);
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
        const newQueryNode = { output: result, queries: [query], needsSyncToPage: updatedNeedsSyncToPage };
        updatedMap.set(key, newQueryNode);
      }
    });
    return updatedMap;
  }

  const getFormulaResults = async (query: string, dialogueContext?: DialogueElement[]): Promise<FormulaOutput | null> => {

    // Perform the query and fetch the results
    const output = await getFormulaOutput(query, pages, dialogueContext);

    if (!output) return null;

    if (output.type === FormulaOutputType.NodeMarkdown) {
      const resultNodes = output.output as NodeMarkdown[];

      // TODO maybe only update the map if things have actually changed

      setSharedNodeMap((prevMap) => {
        return mergeResults(resultNodes, query, prevMap, false);
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

  const updatePagesResults = async (pagesToQuery: Page[]): Promise<void> => {
    
    let updatedMap = new Map(sharedNodeMap);
    const formulas = new Set<string>();

    // Delete current results for the page while collecting all the formulas
    for (const [key] of updatedMap.entries()) {
      const keyElements: SharedNodeKeyElements = getSharedNodeKeyElements(key);
      for (const query of updatedMap.get(key)?.queries??[]) {
        formulas.add(query);
      }
      if (pagesToQuery.some(page => page.title === keyElements.pageName)) updatedMap.delete(key);
    }

    // run all the formulas over the updated pages and add to the shared node map
    getFormulaOutputs(formulas, pagesToQuery)
      .then((outputMap) => {
        outputMap.forEach(( formulaOutput, formula ) => {
          if (formulaOutput && formulaOutput.type === FormulaOutputType.NodeMarkdown) {
            const resultNodes = formulaOutput.output as NodeMarkdown[];
            updatedMap = mergeResults(resultNodes, formula, updatedMap, false);
          }
        });
        setSharedNodeMap(updatedMap);
      })
      .catch((error) => {
        console.error("Error:", error);
      })
  };
  
  return {
    getFormulaResults,
    updatePagesResults
  }
};