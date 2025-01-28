import { Page } from "@/lib/definitions";
import {
  useSharedNodeContext,
  createSharedNodeKey,
  QueryNode,
  SharedNodeKeyElements,
  getSharedNodeKeyElements,
} from "@/_app/context/shared-node-context";
import { getFormulaOutput } from "@/lib/formula/FormulaOutput";
import {
  NodeElementMarkdown,
  FormulaOutput,
  FormulaValueType,
} from "@/lib/formula/formula-definitions";
import { QueryCounter } from './query-counter';
import { getFormulaOutputType } from "./formula-parser";
import { usePageStatusStore } from '@/lib/stores/page-status-store';
import { localPagesRef } from '@/_app/context/storage/dbPages';
import { PageAndDialogueContext } from "@/lib/ai/ai-context";

export const nodeQueries = new QueryCounter();

export function registerFormula(formula: string): void {
  if (getFormulaOutputType(formula) === FormulaValueType.NodeMarkdown) {
    nodeQueries.increment(formula);
  }
}

export function unregisterFormula(formula: string): void {
  if (getFormulaOutputType(formula) === FormulaValueType.NodeMarkdown) {
    nodeQueries.decrement(formula);
  }
}

export const useFormulaResultService = () => {
  const { sharedNodeMap, setSharedNodeMap } = useSharedNodeContext();
  const pages = localPagesRef.current;
  const pageUpdateContext = usePageStatusStore();

  const mergeResults = (
    resultNodes: NodeElementMarkdown[],
    query: string,
    nodeMap: Map<string, QueryNode>,
    updatedNeedsSyncToPage: boolean,
    removeUnmatched: boolean = false,
    pagesToCheck: Page[] = []
  ): Map<string, QueryNode> => {
    const updatedMap = new Map(nodeMap);
    const resultKeys = new Set<string>();
    resultNodes.forEach((result) => {
      if (pagesToCheck.length > 0 && !pagesToCheck.some(p => p.title === result.baseNode.pageName)) {
        return;
      }
      const key = createSharedNodeKey(result);
      resultKeys.add(key);

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
        const newQueryNode = {
          output: result,
          queries: [query],
          needsSyncToPage: updatedNeedsSyncToPage,
        };
        updatedMap.set(key, newQueryNode);
      }
    });

    if (removeUnmatched) {
      updatedMap.forEach((node, key) => {
        if (pagesToCheck.length > 0 && !pagesToCheck.some(p => p.title === node.output.baseNode.pageName)) {
          return;
        }
        if (!resultKeys.has(key)) {
          node.queries = node.queries.filter((q) => q !== query);
          if (node.queries.length === 0) {
            updatedMap.delete(key);
          } else {
            updatedMap.set(key, node);
          }
        }
      });
    }
  
    return updatedMap;
  };

  const checkforChanges = (query: string, results: NodeElementMarkdown[], checkShouldRemove: boolean = false, pagesToCheck: Page[] = []) => {
    const compareNodes = (existingNode: NodeElementMarkdown, newNode: NodeElementMarkdown): boolean => {
      if (existingNode.baseNode.nodeMarkdown !== newNode.baseNode.nodeMarkdown) return true;
      if (existingNode.baseNode.pageName !== newNode.baseNode.pageName) return true;
      if (existingNode.baseNode.lineNumberStart !== newNode.baseNode.lineNumberStart) return true;
      if (existingNode.baseNode.lineNumberEnd !== newNode.baseNode.lineNumberEnd) return true;

      const existingChildren = existingNode.children || [];
      const newChildren = newNode.children || [];

      if (existingChildren.length !== newChildren.length) return true;

      for (let i = 0; i < existingChildren.length; i++) {
        if (compareNodes(existingChildren[i], newChildren[i])) return true;
      }

      return false;
    };

    const resultKeys = new Set<string>();
    for (const result of results) {

      if (pagesToCheck.length > 0 && !pagesToCheck.some(p => p.title === result.baseNode.pageName)) {
        continue;
      }

      const key = createSharedNodeKey(result);
      resultKeys.add(key);
      const existingNode = sharedNodeMap.get(key);

      if (!existingNode) {
        //console.log("existingNode is undefined");
        return true;
      } 
      if (!existingNode.queries.includes(query)) {
        //console.log("existingNode.queries does not include query");
        return true;
      }
      if (compareNodes(existingNode.output, result)) {
        //console.log("compareNodes returned true");
        return true;
      }
    }

    if (!checkShouldRemove) return false;
    
    let needToRemove = false;
    sharedNodeMap.forEach((value, key) => {
      if (pagesToCheck.length > 0 && !pagesToCheck.some(p => p.title === value.output.baseNode.pageName)) {
        return;
      }
      if (!resultKeys.has(key)) {
        if (value.queries.includes(query)) {
          //console.log("query needs to be removed from sharedNodeMap");
          needToRemove = true;
        }
      }
    });

    return needToRemove;
  }

  const getFormulaResults = async (
    query: string,
    context?: PageAndDialogueContext
  ): Promise<FormulaOutput | null> => {
    const output = await getFormulaOutput(query, pages || [], context, pageUpdateContext);
    if (!output) return null;
    console.log("getFormulaResults", output);
    if (output.type === FormulaValueType.NodeMarkdown) {
      const resultNodes = output.output as NodeElementMarkdown[];

      if (checkforChanges(query, resultNodes, true)) {
        setSharedNodeMap((prevMap) => {
          return mergeResults(resultNodes, query, prevMap, false, true);
        });
      }
    }

    return output;
  };

  async function getFormulaOutputs(
    formulas: IterableIterator<string>,
    pages: Page[]
  ): Promise<Map<string, FormulaOutput>> {
    const promises = Array.from(formulas).map(async (formula) => {
      const output = await getFormulaOutput(formula, pages);
      return [formula, output] as [string, FormulaOutput];
    });

    const results = await Promise.all(promises);
    return new Map(results);
  }

  // check if the results for any queries have changed
  const compareSharedNodesToResults = (newResults: Map<string, FormulaOutput>, checkShouldRemove: boolean = false, pagesToCheck: Page[] = []) => {
    // get the set of formulas from the new results
    const newFormulas = new Set(newResults.keys());
    for (const formula of newFormulas) {
      const result = newResults.get(formula);
      if (result?.type === FormulaValueType.NodeMarkdown) {
        const resultNodes = result.output as NodeElementMarkdown[];
        if (checkforChanges(formula, resultNodes, checkShouldRemove, pagesToCheck)) {
          return true;
        }
      }
    }
    return false;
  }
  
  const updatePagesResults = async (pagesToQuery: Page[]): Promise<void> => {
    const startTime = performance.now();
    
    getFormulaOutputs(nodeQueries.getUniqueQueries(), pagesToQuery)
      .then((outputMap) => {
        const afterFormulaTime = performance.now();
        console.log(`Formula outputs took ${afterFormulaTime - startTime}ms`);
        
        if (compareSharedNodesToResults(outputMap, true, pagesToQuery)) {
          const afterCompareTime = performance.now();
          console.log(`Compare results took ${afterCompareTime - afterFormulaTime}ms`);
          
          let updatedMap = new Map(sharedNodeMap);

          // Delete current results for pages we're querying
          for (const [key] of updatedMap.entries()) {
            const keyElements: SharedNodeKeyElements = getSharedNodeKeyElements(key);
            if (pagesToQuery.some((page) => page.title === keyElements.pageName))
              updatedMap.delete(key);
          }
          const afterDeleteTime = performance.now();
          console.log(`Deleting old results took ${afterDeleteTime - afterCompareTime}ms`);

          outputMap.forEach((formulaOutput, formula) => {
            if (
              formulaOutput &&
              formulaOutput.type === FormulaValueType.NodeMarkdown
            ) {
              const resultNodes = formulaOutput.output as NodeElementMarkdown[];
              updatedMap = mergeResults(resultNodes, formula, updatedMap, false, true, pagesToQuery);
            }
          });
          const afterMergeTime = performance.now();
          console.log(`Merging results took ${afterMergeTime - afterDeleteTime}ms`);
          
          setSharedNodeMap(updatedMap);
          console.log(`Total update time: ${performance.now() - startTime}ms`);
        }
      })
      .catch((error) => {
        console.log("🛑Error:", error);
      });
  };

  // we call this when we're updating from shared nodes
  // in this case we just want to make sure new results get added
  // we can be sure this won't affect the selection

  const addPagesResults = async (pagesToQuery: Page[]): Promise<void> => {

    console.log("adding pages results", pagesToQuery.map(p => p.title));
    // run all the formulas over the updated pages and add to the shared node map
    getFormulaOutputs(nodeQueries.getUniqueQueries(), pagesToQuery)
      .then((outputMap) => {
        if (compareSharedNodesToResults(outputMap)) {
          let updatedMap = new Map(sharedNodeMap);
          outputMap.forEach((formulaOutput, formula) => {
            if (
              formulaOutput &&
              formulaOutput.type === FormulaValueType.NodeMarkdown
            ) {
              const resultNodes = formulaOutput.output as NodeElementMarkdown[];
              updatedMap = mergeResults(resultNodes, formula, updatedMap, false);
            }
          });
          setSharedNodeMap(updatedMap);
        }
      })
      .catch((error) => {
        console.log("🛑 Error:", error);
      });
  };

  return {
    getFormulaResults,
    updatePagesResults,
    addPagesResults,
  };
};
