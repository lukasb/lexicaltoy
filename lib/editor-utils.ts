import { LexicalEditor } from "lexical";
import { createHeadlessEditor } from '@lexical/headless';
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { WikilinkNode, WikilinkInternalNode } from "@/_app/nodes/WikilinkNode";
import { TodoCheckboxStatusNode } from "@/_app/nodes/TodoNode";
import { FormulaEditorNode, FormulaDisplayNode } from "@/_app/nodes/FormulaNode";
import { FormattableTextNode } from "@/_app/nodes/FormattableTextNode";

export function myCreateHeadlessEditor(): LexicalEditor {
  const editor = createHeadlessEditor({
    nodes: [
      LinkNode,
      ListNode,
      ListItemNode,
      AutoLinkNode,
      WikilinkNode,
      WikilinkInternalNode,
      TodoCheckboxStatusNode,
      FormulaEditorNode,
      FormulaDisplayNode,
      FormattableTextNode
    ],
    onError: console.error,
    namespace: "headless"
  });
  return editor;
}