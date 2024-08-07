import { 
  LexicalEditor,
  ElementNode,
  $getNodeByKey,
  NodeMutation
} from "lexical";
import {
  ListItemNode,
  $isListItemNode
} from "@lexical/list";
import { mergeRegister } from "@lexical/utils";
import { NodeElementMarkdown, updateDescendant } from "@/lib/formula/formula-definitions";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import {
  $getFormulaNodeFromSharedNode,
  $getContainingListItemNode,
  $getWikilinkNodeFromSharedNode,
  $replaceDisplayNodeWithEditor,
} from "./formula-node-helpers";
import { FormulaDisplayNode } from "@/_app/nodes/FormulaNode";
import { WikilinkNode } from "@/_app/nodes/WikilinkNode";
import { FormattableTextNode } from "@/_app/nodes/FormattableTextNode";
import { TodoCheckboxStatusNode } from "@/_app/nodes/TodoNode";
import { ChildSharedNodeReference } from ".";

export function registerFormulaMutationListeners(
  editor: LexicalEditor,
  localSharedNodeMap: Map<string, NodeElementMarkdown>,
  childSharedNodeMap: Map<string, ChildSharedNodeReference>,
  updateNodeMarkdownGlobal: (updatedNodeMarkdown: NodeElementMarkdown, needsSyncToPage: boolean) => void,
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

              // right now we only support list item results
              // get the existing node markdown for the modified node so that
              // we can preserve the existing indentation when updating the markdown

              const childNodeReference = childSharedNodeMap.get(listItemKey);
              if (!childNodeReference) continue;
              const parentNodeMarkdown = localSharedNodeMap.get(childNodeReference?.parentLexicalNodeKey);
              if (!parentNodeMarkdown) continue;
              
              const childNodeMarkdown = childNodeReference.baseNodeMarkdown.nodeMarkdown;
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
                  console.log("current", childNodeReference.baseNodeMarkdown);
                  const newParent = updateDescendant(
                    parentNodeMarkdown,
                    childNodeReference.baseNodeMarkdown,
                    updatedChildNodeMarkdown
                  );                  
                  console.log("new", newParent.baseNode);
                  const formulaDisplayNode =
                    $getFormulaNodeFromSharedNode(listItem);
                  const displayNodeKey = formulaDisplayNode?.getKey() ?? null;
                  setUpdatingNodeKey(displayNodeKey);

                  localSharedNodeMap.set(
                    childNodeReference?.parentLexicalNodeKey,
                    newParent
                  );

                  childSharedNodeMap.set(listItemKey, {
                    parentLexicalNodeKey: childNodeReference.parentLexicalNodeKey,
                    baseNodeMarkdown: {
                      ...childNodeReference.baseNodeMarkdown,
                      nodeMarkdown: updatedChildNodeMarkdown
                    }
                  });

                  updateNodeMarkdownGlobal(
                    newParent,
                    true // set needsSyncToPage to true
                  );
              }
            }
          }
        });
    };

    return mergeRegister(
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
        const listItems = new Set<ListItemNode>();
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
                listItems.add(listItemNode);
                const wikilink = $getWikilinkNodeFromSharedNode(listItemNode);
                if (wikilink) {
                  const parentWikilink = wikilink.getParent();
                  if (parentWikilink && $isListItemNode(parentWikilink)) {
                    listItems.add(parentWikilink);
                  }
                }
              }
            }
            for (const [listItemKey, nodeMarkdown] of childSharedNodeMap) {
              const listItemNode = $getNodeByKey(listItemKey) as ListItemNode;
              if (
                listItemNode &&
                $getFormulaNodeFromSharedNode(listItemNode) === null
              ) {
                childSharedNodeMap.delete(listItemKey);
                listItems.add(listItemNode);
              }
            }
          }
        });
        if (listItems.size > 0) {
          editor.update(() => {
            for (const listItem of listItems) {
              listItem.remove();
            }
          });
        }
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