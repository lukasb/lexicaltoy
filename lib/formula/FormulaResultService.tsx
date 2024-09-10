import { useContext } from "react";
import { Page } from "@/lib/definitions";
import {
  useSharedNodeContext,
  createSharedNodeKey,
  QueryNode,
  SharedNodeKeyElements,
  getSharedNodeKeyElements,
} from "@/_app/context/shared-node-context";
import { getFormulaOutput, PageAndDialogueContext } from "@/lib/formula/FormulaOutput";
import { PagesContext } from "@/_app/context/pages-context";
import {
  NodeElementMarkdown,
  FormulaOutput,
  FormulaValueType,
} from "@/lib/formula/formula-definitions";
import { DialogueElement } from "../ai";
import { QueryCounter } from './query-counter';
import { getFormulaOutputType } from "./formula-parser";

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
  const pages = useContext(PagesContext);

  const mergeResults = (
    resultNodes: NodeElementMarkdown[],
    query: string,
    nodeMap: Map<string, QueryNode>,
    updatedNeedsSyncToPage: boolean,
    removeUnmatched: boolean = false
  ): Map<string, QueryNode> => {
    const updatedMap = new Map(nodeMap);
    const resultKeys = new Set<string>();
    resultNodes.forEach((result) => {
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

  const getFormulaResults = async (
    query: string,
    context?: PageAndDialogueContext
  ): Promise<FormulaOutput | null> => {
    // Perform the query and fetch the results
    const output = await getFormulaOutput(query, pages, context);

    if (!output) return null;

    if (output.type === FormulaValueType.NodeMarkdown) {
      const resultNodes = output.output as NodeElementMarkdown[];

      // TODO maybe only update the map if things have actually changed

      setSharedNodeMap((prevMap) => {
        return mergeResults(resultNodes, query, prevMap, false, true);
      });
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

  const updatePagesResults = async (pagesToQuery: Page[]): Promise<void> => {
    let updatedMap = new Map(sharedNodeMap);

    // Delete current results for the page
    for (const [key] of updatedMap.entries()) {
      const keyElements: SharedNodeKeyElements = getSharedNodeKeyElements(key);
      if (pagesToQuery.some((page) => page.title === keyElements.pageName))
        updatedMap.delete(key);
    }

    // run all the formulas over the updated pages and add to the shared node map
    getFormulaOutputs(nodeQueries.getUniqueQueries(), pagesToQuery)
      .then((outputMap) => {
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
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // we call this when we're updating from shared nodes
  // in this case we just want to make sure new results get added
  // we can be sure this won't affect the selection

  const addPagesResults = async (pagesToQuery: Page[]): Promise<void> => {
    let updatedMap = new Map(sharedNodeMap);

    // run all the formulas over the updated pages and add to the shared node map
    getFormulaOutputs(nodeQueries.getUniqueQueries(), pagesToQuery)
      .then((outputMap) => {
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
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  return {
    getFormulaResults,
    updatePagesResults,
    addPagesResults,
  };
};
