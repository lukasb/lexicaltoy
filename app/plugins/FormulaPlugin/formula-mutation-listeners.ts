import { 
  LexicalEditor,
  ElementNode,
  LexicalNode,
  $getNodeByKey,
  NodeMutation
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
  $getWikilinkNodeFromSharedNode,
  $replaceDisplayNodeWithEditor
} from "./formula-node-helpers";
import { FormulaDisplayNode } from "@/app/nodes/FormulaNode";
import { WikilinkNode } from "@/app/nodes/WikilinkNode";
import { FormattableTextNode } from "@/app/nodes/FormattableTextNode";
import { TodoCheckboxStatusNode } from "@/app/nodes/TodoNode";

export function registerFormulaMutationListeners(
  editor: LexicalEditor,
  localSharedNodeMap: Map<string, NodeMarkdown>,
  updateNodeMarkdownGlobal: (updatedNodeMarkdown: NodeMarkdown, needsSyncToPage: boolean) => void,
  setUpdatingNodeKey: (updatingNodeKey: string | null) => void,
  ) {

    const handleSharedNodeUpdate = (mutations: Map<string, NodeMutation>) => {
      if (localSharedNodeMap.size === 0) return;

        editor.getEditorState().read(() => {
          for (const [key, type] of mutations) {
            const node = $getNodeByKey(key);
            if (!node) continue;

            const listItem = $getContainingListItemNode(node);
            if (!listItem) continue;

            if (localSharedNodeMap.has(listItem.getKey())) {
              console.log("mutation in query result");

              const listItemKey = listItem.getKey();

              // right now we only support list item results
              // make sure we have the correct prefix for the list item or we'll
              // screw up indentation
              const listItemPrefixRegex = /^(\s*- )/;
              const match = localSharedNodeMap.get(listItemKey)?.nodeMarkdown.match(listItemPrefixRegex);
              let listItemPrefix = "- ";
              if (match) {
                listItemPrefix = match[1];
              }

              // TODO a better way to normalize node markdown
              const updatedNodeMarkdown =
                listItemPrefix +
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
    };

    return mergeRegister(
      /*editor.registerMutationListener(ListItemNode, (mutations) => {
        if (localSharedNodeMap.size === 0) return;

        editor.getEditorState().read(() => {
          for (const [key, type] of mutations) {
            if (key in localSharedNodeMap.keys()) {
              // this doesn't work but the code might be useful later

              
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
            

              if (type === "destroyed") {
                // TODO handle this
              }
            }
          }
        });
      }),*/
      editor.registerMutationListener(FormattableTextNode, (mutations) => {
        handleSharedNodeUpdate(mutations);
      }),
      editor.registerMutationListener(TodoCheckboxStatusNode, (mutations) => {
        // TODO marking a todo done will trigger this mutation listener, and will also
        // trigger the FormattableTextNode mutation listener by setting strikethrough,
        // leading to double updates. this is unfortunate.
        handleSharedNodeUpdate(mutations);
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
      }),
      editor.registerMutationListener(WikilinkNode, (mutations) => {

        if (localSharedNodeMap.size === 0) return;
        const displayNodes = new Set<FormulaDisplayNode>();
        editor.getEditorState().read(() => {
          for (const [key, type] of mutations) {
            if (type !== "destroyed") continue;
            for (const [listItemKey, nodeMarkdown] of localSharedNodeMap) {
              const listItemNode = $getNodeByKey(listItemKey) as ListItemNode;
              if (
                listItemNode &&
                $getWikilinkNodeFromSharedNode(listItemNode) === null
              ) {
                const displayNode = $getFormulaNodeFromSharedNode(listItemNode);
                if (displayNode) displayNodes.add(displayNode);
              }
            }
          }
        });
        if (displayNodes.size > 0) {
          console.log("replacing display nodes with editor nodes");
          editor.update(() => {
            for (const displayNode of displayNodes) {
              $replaceDisplayNodeWithEditor(displayNode);
            }
          });
        }
      }),
    );
  }