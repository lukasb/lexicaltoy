import { LinkNode, AutoLinkNode } from "@lexical/link";
import { ListNode, ListItemNode } from "@lexical/list";
import { TextNode } from 'lexical';
import { WikilinkNode, WikilinkInternalNode } from "@/_app/nodes/WikilinkNode";
import { TodoCheckboxStatusNode } from "@/_app/nodes/TodoNode";
import { FormulaEditorNode, FormulaDisplayNode } from "@/_app/nodes/FormulaNode";
import { FormattableTextNode } from "@/_app/nodes/FormattableTextNode";

export const editorNodes = [
  LinkNode,
  ListNode,
  ListItemNode,
  AutoLinkNode,
  WikilinkNode,
  WikilinkInternalNode,
  TodoCheckboxStatusNode,
  FormulaEditorNode,
  FormulaDisplayNode,
  FormattableTextNode,
  {
    replace: TextNode,
    with: (node: TextNode) => new FormattableTextNode(node.__text)
  }
];