import { 
  LexicalEditor,
  ElementNode,
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
import { ChildSharedNodeReference } from ".";

export function registerFormulaMutationListeners(
  editor: LexicalEditor,
  localSharedNodeMap: Map<string, NodeMarkdown>,
  childSharedNodeMap: Map<string, ChildSharedNodeReference>,
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

            if (localSharedNodeMap.has(listItem.getKey()) || childSharedNodeMap.has(listItem.getKey())) {

              const listItemKey = listItem.getKey();

              console.log("mutation type", type); 
              console.log("listitem key contents", listItemKey, listItem.getTextContent());

              // right now we only support list item results
              // get the existing node markdown for the modified node so that
              // we can preserve the existing indentation when updating the markdown

              const childNodeReference = childSharedNodeMap.get(listItemKey);
              if (!childNodeReference) continue;
              const parentNodeMarkdown = localSharedNodeMap.get(childNodeReference?.parentLexicalNodeKey);
              if (!parentNodeMarkdown) continue;
              const childNodeMarkdown = 
                parentNodeMarkdown.nodeMarkdown.split("\n")[childNodeReference.childLineNumWithinParent];
              
              const listItemPrefixRegex = /^(\s*- )/;
              const match = childNodeMarkdown.match(listItemPrefixRegex);
              let listItemPrefix = match ? match[1] : "- ";

              // TODO a better way to normalize node markdown
              const updatedChildNodeMarkdown =
                listItemPrefix +
                $convertToMarkdownString(TRANSFORMERS, {
                  getChildren: () => [listItem],
                } as unknown as ElementNode);

              if (
                updatedChildNodeMarkdown !==
                childNodeMarkdown
              ) {

                  const markdownLines = parentNodeMarkdown.nodeMarkdown.split("\n");
                  markdownLines[childNodeReference.childLineNumWithinParent] = updatedChildNodeMarkdown;
                  const updatedNodeMarkdown = markdownLines.join("\n");

                  const formulaDisplayNode =
                    $getFormulaNodeFromSharedNode(listItem);
                  const displayNodeKey = formulaDisplayNode?.getKey() ?? null;
                  setUpdatingNodeKey(displayNodeKey);

                  localSharedNodeMap.set(childNodeReference?.parentLexicalNodeKey, {
                    pageName: parentNodeMarkdown.pageName,
                    lineNumberStart: parentNodeMarkdown.lineNumberStart,
                    lineNumberEnd: parentNodeMarkdown.lineNumberEnd,
                    nodeMarkdown: updatedNodeMarkdown,
                  });

                  console.log("old node markdown", parentNodeMarkdown.nodeMarkdown);
                  console.log("updated node markdown", updatedNodeMarkdown);
                  updateNodeMarkdownGlobal(
                    { ...parentNodeMarkdown, nodeMarkdown: updatedNodeMarkdown },
                    true // set needsSyncToPage to true
                  );
              }
            }
          }
        });
    };

    return mergeRegister(
      editor.registerMutationListener(FormattableTextNode, (mutations) => {
        console.log("formattable text node mutation listener");
        handleSharedNodeUpdate(mutations);
      }),
      editor.registerMutationListener(TodoCheckboxStatusNode, (mutations) => {
        console.log("todo checkbox status node mutation listener");
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