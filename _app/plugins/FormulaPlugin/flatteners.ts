import {
  $createTextNode,
} from "lexical";
import {
  ListItemNode
} from "@lexical/list";
import {
  FormulaDisplayNode,
} from "@/_app/nodes/FormulaNode";
import { NodeElementMarkdown } from "@/lib/formula/formula-definitions";
import { ChildSharedNodeReference } from ".";
import { $getListContainingChildren } from '@/lib/list-utils';

interface SharedNodeIds {
  sharedNodeListItemId: string;
  childrenListItemIds: string[];
}

// returns a list of shared node ids, along with a flattened list of all descendant shared node ids
function getSharedNodeIds(displayNode: FormulaDisplayNode): SharedNodeIds[] {

  function getNestedSharedNodeIds(listItemNode: ListItemNode): string[] {
    const childrenList = $getListContainingChildren(listItemNode);
    if (!childrenList) return [];
    const sharedNodeIds: string[] = [];
    for (const child of childrenList.getChildren()) {
      sharedNodeIds.push(child.getKey());
      const grandChildrenList = $getListContainingChildren(child as ListItemNode);
      if (grandChildrenList) {
        sharedNodeIds.push(...getNestedSharedNodeIds(child as ListItemNode));
      }
    }
    return sharedNodeIds;
  }

  const childrenList = $getListContainingChildren(displayNode.getParent() as ListItemNode);
  if (!childrenList) return [];
  const sharedNodeIds: SharedNodeIds[] = [];
  for (const child of childrenList.getChildren()) {
    // wikilinks
    const wikilinkChildrenList = $getListContainingChildren(child as ListItemNode);
    if (wikilinkChildrenList) {
      for (const grandChild of wikilinkChildrenList.getChildren()) {
        sharedNodeIds.push({
          sharedNodeListItemId: grandChild.getKey(),
          childrenListItemIds: getNestedSharedNodeIds(grandChild as ListItemNode)
        });
      }
    }
  }
  return sharedNodeIds;
}

export function $flattenFormulaDisplayNodeResults(
  displayNode: FormulaDisplayNode, 
  setLocalSharedNodeMap: React.Dispatch<React.SetStateAction<Map<string, NodeElementMarkdown>>>,
  setLocalChildNodeMap: React.Dispatch<React.SetStateAction<Map<string, ChildSharedNodeReference>>>)
{
  const nodeFormula = displayNode.getFormula();
  if (nodeFormula.startsWith('ask(') && nodeFormula.endsWith(')')) {
    let newNodeText = nodeFormula.slice(4, -1).trim(); // use ask arguments as text
    if (displayNode.getBlockId()) {
      newNodeText += ' ' + displayNode.getBlockId();
    }
    const textNode = $createTextNode(newNodeText);
    displayNode.replace(textNode);
    textNode.selectEnd();
  } else if (nodeFormula.startsWith('find(') && nodeFormula.endsWith(')')) {
  
    // remove the shared nodes from the shared node maps, otherwise our mutation listener will destroy them
    // when the display node is destroyed
    
    const sharedNodeIds = getSharedNodeIds(displayNode);

    setLocalSharedNodeMap((prevMap: Map<string, NodeElementMarkdown>) => {
      const updatedMap = new Map(prevMap);
      for (const sharedNode of sharedNodeIds) {
        console.log("removing from map", sharedNode.sharedNodeListItemId);
        updatedMap.delete(sharedNode.sharedNodeListItemId);
      }
      return updatedMap;
    });

    setLocalChildNodeMap((prevMap: Map<string, ChildSharedNodeReference>) => {
      const updatedMap = new Map(prevMap);
      for (const sharedNode of sharedNodeIds) {
        updatedMap.delete(sharedNode.sharedNodeListItemId);
        for (const childId of sharedNode.childrenListItemIds) {
          console.log("removing from child map", childId);
          updatedMap.delete(childId);
        }
      }
      return updatedMap;
    });

    let newNodeText = nodeFormula.slice(5, -1).trim(); // use find arguments as text
    if (displayNode.getBlockId()) {
      newNodeText += ' ' + displayNode.getBlockId();
    }
    const textNode = $createTextNode(newNodeText);
    displayNode.replace(textNode);
    textNode.selectEnd();
  }
}