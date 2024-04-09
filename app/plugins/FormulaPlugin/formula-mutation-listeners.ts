import { 
  LexicalEditor,
  TextNode,
  ElementNode,
  $getNodeByKey,
} from "lexical";
import {
  ListItemNode,
} from "@lexical/list";
import { mergeRegister } from "@lexical/utils";
import { NodeMarkdown } from "../../lib/formula/formula-definitions";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import {
  $getFormulaNodeFromSharedNode,
  $getContainingListItemNode,
} from "./formula-node-helpers";
import { FormulaDisplayNode } from "@/app/nodes/FormulaNode";

export function registerFormulaMutationListeners(
  editor: LexicalEditor,
  localSharedNodeMap: Map<string, NodeMarkdown>,
  updateNodeMarkdownGlobal: (updatedNodeMarkdown: NodeMarkdown, needsSyncToPage: boolean) => void,
  setUpdatingNodeKey: (updatingNodeKey: string | null) => void,
  ) {
    return mergeRegister(
      editor.registerMutationListener(ListItemNode, (mutations) => {
        if (localSharedNodeMap.size === 0) return;

        editor.getEditorState().read(() => {
          for (const [key, type] of mutations) {
            if (key in localSharedNodeMap.keys()) {
              // this doesn't work but the code might be useful later

              /*
            if (type === "updated") {
              const node = $getNodeByKey(key);
              const updatedNodeMarkdown = $convertToMarkdownString(
                TRANSFORMERS,
                { getChildren: () => [node] } as unknown as ElementNode
              );
              if (updatedNodeMarkdown !== localSharedNodeMap.get(key)?.nodeMarkdown) {
                const oldNodeMarkdown = localSharedNodeMap.get(key);
                if (oldNodeMarkdown) {
                  updateNodeMarkdownGlobal({ ...oldNodeMarkdown, nodeMarkdown: updatedNodeMarkdown });
                }
              }
            }
            */

              if (type === "destroyed") {
                // TODO handle this
              }
            }
          }
        });
      }),
      editor.registerMutationListener(TextNode, (mutations) => {
        if (localSharedNodeMap.size === 0) return;

        editor.getEditorState().read(() => {
          for (const [key, type] of mutations) {
            const node = $getNodeByKey(key);
            if (!node) continue;

            const listItem = $getContainingListItemNode(node);
            if (!listItem) continue;

            if (localSharedNodeMap.has(listItem.getKey())) {
              const listItemKey = listItem.getKey();

              // TODO a better way to normalize node markdown
              const updatedNodeMarkdown =
                "- " +
                $convertToMarkdownString(TRANSFORMERS, {
                  getChildren: () => [listItem],
                } as unknown as ElementNode);

              if (
                updatedNodeMarkdown !==
                localSharedNodeMap.get(listItemKey)?.nodeMarkdown
              ) {
                const oldNodeMarkdown = localSharedNodeMap.get(listItemKey);
                if (oldNodeMarkdown) {
                  const formulaDisplayNode =
                    $getFormulaNodeFromSharedNode(listItem);
                  setUpdatingNodeKey(formulaDisplayNode?.getKey() ?? null);

                  localSharedNodeMap.set(listItemKey, {
                    pageName: oldNodeMarkdown.pageName,
                    lineNumber: oldNodeMarkdown.lineNumber,
                    nodeMarkdown: updatedNodeMarkdown,
                  });
                  updateNodeMarkdownGlobal(
                    { ...oldNodeMarkdown, nodeMarkdown: updatedNodeMarkdown },
                    true // set needsSyncToPage to true
                  );
                }
              }
            }
          }
        });
      }),
      editor.registerMutationListener(FormulaDisplayNode, (mutations) => {

        // right now if any formula display node is destroyed, we check
        // all the local shared nodes to see if they still have a display node
        // maybe make this more efficient by keeping a mapping from shared nodes to display nodes

        if (localSharedNodeMap.size === 0) return;
        editor.getEditorState().read(() => {
          for (const [key, type] of mutations) {
            if (type !== "destroyed") continue;
            for (const [listItemKey, nodeMarkdown] of localSharedNodeMap) {
              const listItemNode = $getNodeByKey(listItemKey) as ListItemNode;
              if (
                listItemNode &&
                $getFormulaNodeFromSharedNode(listItemNode) === null
              ) {
                localSharedNodeMap.delete(listItemKey);
              }
            }
          }
        });
      })
    );
  }