import { useEffect, useContext } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { PagesContext } from "../context/pages-context";
import { 
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from "@lexical/markdown";
import { PageStatus } from "@/lib/definitions";
import { getNextListItem } from "@/lib/list-utils";
import { 
  $getRoot,
  RootNode,
  $isRootNode,
  ElementNode,
  $getSelection,
  $setSelection,
  $isRangeSelection,
  $createPoint,
  $createRangeSelection
} from "lexical";
import { 
  ListItemNode,
  $isListItemNode,
  $isListNode,
  ListNode
} from "@lexical/list";
import { $isFormulaDisplayNode } from "../nodes/FormulaNode";
import { $myConvertFromMarkdownString } from "@/lib/markdown/markdown-import";
import { usePageStatus } from "@/_app/context/page-update-context";

const listItemRegex = /^(\s*)-\s*(.+)$/;

function $updateListItems(root: RootNode, markdownLines: string[]) {
  let element: ElementNode | null = root;
  let previousBlank = true;
  for (let i = 0; i < markdownLines.length; i++) {
    if ($isRootNode(element)) {
      element = element.getChildAtIndex(0);
    }
    const match = markdownLines[i].match(listItemRegex);
    // line is a new line within current element (ie user hit shift-enter)
    if (markdownLines[i] !== "" && !match && !previousBlank) continue;
    if (match) {
      previousBlank = false;
      if ($isListNode(element)) {
        element = element.getChildAtIndex(0) as ListItemNode;
      } else if ($isListItemNode(element)) {
        const child = element.getChildAtIndex(0);
        if (child && $isFormulaDisplayNode(child)) {
          element = getNextListItem(element as ListItemNode, true);
        } else {
          element = getNextListItem(element as ListItemNode, false);
        }
      } else {
        const sibling = element?.getNextSibling();
        if ($isListNode(sibling)) {
          element = (sibling as ListNode).getChildAtIndex(0);
        }
      }
      if ($isListItemNode(element) && !match[2].startsWith("=find(")) {
        let newMarkdown = match[2];
        let j = i + 1;
        for (; j < markdownLines.length; j++) {
          if (markdownLines[j] === "") break;
          const nextMatch = markdownLines[j].match(listItemRegex);
          if (nextMatch) break;
          newMarkdown = newMarkdown + "\n" + markdownLines[j];
        }
        // TODO maybe use $myConvertFromMarkdownString - $convertFromMarkdownString will always try to move the selection
        // TODO we don't update FDNs here well. this just breaks. handle updates to formula nodes in shared nodes better.
        let skip = false;
        if (newMarkdown.startsWith("=")) {
          const oldMarkdown = $convertToMarkdownString(TRANSFORMERS, {
            getChildren: () => [element],
          } as unknown as ElementNode);
          if (oldMarkdown === newMarkdown) skip = true;
        }
        if (!skip) {
          $convertFromMarkdownString(newMarkdown, TRANSFORMERS, element as ListItemNode);
        }
      }
    } else if (markdownLines[i] !== "") {
      previousBlank = false;
      if ($isListItemNode(element)) {
        let parent = element.getParent();
        while (parent && parent !== root) {
          element = parent;
          parent = element?.getParent();
        }
      } 
      if (element) {
        element = element.getNextSibling();
      } else {
        return null;
      }
    } else {
      previousBlank = true;
    }
  }
}

export function PageListenerPlugin({
  pageId
}: {
  pageId: string;
}): null {
  const [editor] = useLexicalComposerContext();
  const pages = useContext(PagesContext);
  const { pageStatuses, getUpdatedPageValue } = usePageStatus();

  // make sure open editors update their contents when updates from shared nodes occur

  // TODO this is sort of race-y since FormulaPlugin is also listening for this PageStatus
  // and will change the status when it's done processing. we maybe should introduce another status
  // that we set here when we're done using the updated page value
  // (works so far though...)

  useEffect(() => {
      if (
        pageStatuses.get(pageId)?.status === PageStatus.EditFromSharedNodes ||
        pageStatuses.get(pageId)?.status === PageStatus.EditorUpdateRequested
      ) {
        const page = pages?.find((page) => page.id === pageId);
        if (!page) return;
        // I am so, so sorry.
        const newValue = pageStatuses.get(pageId)?.status === PageStatus.EditFromSharedNodes ? getUpdatedPageValue(page) : page.value;
        if (newValue === undefined) return;
        queueMicrotask(() => {
          editor.update(() => {
            if (
              (editor.isEditable() &&
              !editor.isComposing() &&
              editor.getRootElement() !== document.activeElement) ||
              pageStatuses.get(pageId)?.status === PageStatus.EditorUpdateRequested
            ) {
              editor.setEditable(false); // prevent focus stealing
              $myConvertFromMarkdownString(newValue, false);
            } else {
              const selection = $getSelection();
              let anchorKey = undefined;
              let focusKey = undefined;
              let anchorOffset = 0;
              let focusOffset = 0;
              if ($isRangeSelection(selection)) {
                anchorKey = selection.anchor.key;
                focusKey = selection.focus.key;
                anchorOffset = selection.anchor.offset;
                focusOffset = selection.focus.offset;
              }
              const root = $getRoot();
              $updateListItems(root, newValue.split("\n"));
              if (anchorKey && focusKey) {
                const newSelection = $createRangeSelection();
                newSelection.anchor = $createPoint(anchorKey, anchorOffset, 'text');
                newSelection.focus = $createPoint(focusKey, focusOffset, 'text');
                $setSelection(newSelection);
              }
            }
          });
        });
      }
  }, [editor, pageId, pages, pageStatuses, getUpdatedPageValue]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      if (!editor.isEditable()) {
          editor.setEditable(true);
      }
    });
  }, [editor]);

  return null;
}
