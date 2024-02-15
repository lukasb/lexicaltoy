import { EditorState, LexicalEditor, createEditor } from "lexical";
import { ListNode, ListItemNode, $createListNode, $createListItemNode } from "@lexical/list";
import { $getRoot, $createTextNode } from "lexical";
import { registerListCommands } from "./ListCommandsPlugin";
import { 
  DELETE_LISTITEM_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  INDENT_LISTITEM_COMMAND,
  OUTDENT_LISTITEM_COMMAND,
  PREPEND_NEW_CHILD_COMMAND
} from '../lib/list-commands';
import { $getListContainingChildren } from "../lib/list-utils";

async function testEditorCommand({
  editor,
  command,
  commandArgs,
  expectationFunction
}: {
  editor: LexicalEditor,
  command: any,
  commandArgs: any,
  expectationFunction: (editorState: any) => void
}) {
  const waitForUpdate = new Promise<void>((resolve, reject) => {
    const unregisterListener = editor.registerUpdateListener(
      ({ editorState }) => {
        try {
          const editorState = editor.getEditorState();
          editorState.read(() => {
            expectationFunction(editorState);
          });
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          unregisterListener();
        }
      }
    );
  });

  editor.dispatchCommand(command, commandArgs);

  editor.update(() => {
    $getRoot().append($createListNode("bullet")); // force an update
  });

  // Wait for the update listener to be called
  await waitForUpdate;
}

describe('ListCommandsPlugin', () => {
  let editor: LexicalEditor;
  let parentList: ListNode;
  let childList1: ListNode;
  let childList2: ListNode;
  let childList3: ListNode;
  let node1: ListItemNode;
  let node2: ListItemNode;
  let node3: ListItemNode;
  let node4: ListItemNode;
  let node5: ListItemNode;

  beforeEach(() => {
    const initialEditorStateString = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
    const initialConfig = {
      namespace: 'MyEditor',
      nodes: [ListNode, ListItemNode],
    };
    editor = createEditor(initialConfig);
    editor.setEditorState(editor.parseEditorState(initialEditorStateString));
    editor.update(() => {

      // Create a list that looks like
      // - node1
      //   - node2
      //    - node4
      // - node3
      //   - node5
      parentList = $createListNode("bullet");
      childList1 = $createListNode("bullet");
      childList2 = $createListNode("bullet");
      childList3 = $createListNode("bullet");
      node1 = $createListItemNode();
      node1.append($createTextNode("node1"));
      node2 = $createListItemNode();
      node2.append($createTextNode("node2"));
      node3 = $createListItemNode();
      node3.append($createTextNode("node3"));
      node4 = $createListItemNode();
      node4.append($createTextNode("node4"));
      node5 = $createListItemNode();
      node5.append($createTextNode("node5"));

      parentList.append(node1);
      parentList.append(childList1); // lexical will automatically insert this inside a ListItemNode
      childList1.append(node2);
      childList1.append(childList2);
      childList2.append(node4);
      parentList.append(node3);
      parentList.append(childList3);
      childList3.append(node5);
      $getRoot().append(parentList);
    });

    registerListCommands(editor);
  });

  test('DELETE_LISTITEM_COMMAND removes a non-nested item', async () => {
    await testEditorCommand({
      editor: editor,
      command: DELETE_LISTITEM_COMMAND,
      commandArgs: { listItem: node3, fixSelection: true },
      expectationFunction: (editorState) => {
        expect(parentList.getChildrenSize()).toBe(2);
        const secondChild = parentList.getChildren()[1] as ListItemNode;
        const nestedList = secondChild.getChildren()[0] as ListNode;
        const nestedChild = nestedList.getChildren()[0] as ListItemNode;
        const textNode = nestedChild.getChildren()[0];
        expect(textNode.getTextContent()).toBe("node2");
      }
    });
  });

  test('DELETE_LISTITEM_COMMAND removes a nested item', async () => {
    await testEditorCommand({
      editor: editor,
      command: DELETE_LISTITEM_COMMAND,
      commandArgs: { listItem: node2, fixSelection: true },
      expectationFunction: (editorState) => {
        expect(parentList.getChildrenSize()).toBe(3);
        const secondChild = parentList.getChildren()[1] as ListItemNode;
        const textNode = secondChild.getChildren()[0];
        expect(textNode.getTextContent()).toBe("node3");
      }
    });
  });

  test('DELETE_LISTITEM_COMMAND removing parent removes child', async () => {
    await testEditorCommand({
      editor: editor,
      command: DELETE_LISTITEM_COMMAND,
      commandArgs: { listItem: node1, fixSelection: true },
      expectationFunction: (editorState) => {
        expect(parentList.getChildrenSize()).toBe(2);
      }
    });
  });

  test('OUTDENT_LISTITEM_COMMAND outdents nested list item', async () => {
    await testEditorCommand({
      editor: editor,
      command: OUTDENT_LISTITEM_COMMAND,
      commandArgs: { listItem: node2 },
      expectationFunction: (editorState) => {
        expect(node2.getIndent()).toBe(0);
      }
    });
  });

  test('OUTDENT_LISTITEM_COMMAND does not outdent non-nested list item', async () => {
    await testEditorCommand({
      editor: editor,
      command: OUTDENT_LISTITEM_COMMAND,
      commandArgs: { listItem: node1 },
      expectationFunction: (editorState) => {
        expect(node1.getIndent()).toBe(0);
      }
    });
  });

  test('OUTDENT_LISTITEM_COMMAND outdenting parent outdents child', async () => {
    await testEditorCommand({
      editor: editor,
      command: OUTDENT_LISTITEM_COMMAND,
      commandArgs: { listItem: node2 },
      expectationFunction: (editorState) => {
        expect(node4.getIndent()).toBe(1);
      }
    });
  });

  test('INDENT_LISTITEM_COMMAND indents node with elder sibling', async () => {
    await testEditorCommand({
      editor: editor,
      command: INDENT_LISTITEM_COMMAND,
      commandArgs: { listItem: node3 },
      expectationFunction: (editorState) => {
        expect(node3.getIndent()).toBe(1);
      }
    });
  });

  test('INDENT_LISTITEM_COMMAND indenting parent indents child', async () => {
    await testEditorCommand({
      editor: editor,
      command: INDENT_LISTITEM_COMMAND,
      commandArgs: { listItem: node3 },
      expectationFunction: (editorState) => {
        expect(node5.getIndent()).toBe(2);
      }
    });
  });

  test('INDENT_LISTITEM_COMMAND does not indent eldest child', async () => {
    await testEditorCommand({
      editor: editor,
      command: INDENT_LISTITEM_COMMAND,
      commandArgs: { listItem: node1 },
      expectationFunction: (editorState) => {
        expect(node3.getIndent()).toBe(0);
      }
    });
  });

  test('INDENT_LISTITEM_COMMAND does not indent if already indented', async () => {
    await testEditorCommand({
      editor: editor,
      command: INDENT_LISTITEM_COMMAND,
      commandArgs: { listItem: node2 },
      expectationFunction: (editorState) => {
        expect(node2.getIndent()).toBe(1);
      }
    });
  });

  test('PREPEND_NEW_CHILD_COMMAND prepends a new child if children already exist', async () => {
    await testEditorCommand({
      editor: editor,
      command: PREPEND_NEW_CHILD_COMMAND,
      commandArgs: { listItem: node1 },
      expectationFunction: (editorState) => {
        const node1Child = childList1.getChildren()[0] as ListItemNode;
        expect(node1Child.getTextContentSize()).toBe(0);
      }
    });
  });

  test('PREPEND_NEW_CHILD_COMMAND prepends a new child if no children', async () => {
    await testEditorCommand({
      editor: editor,
      command: PREPEND_NEW_CHILD_COMMAND,
      commandArgs: { listItem: node5 },
      expectationFunction: (editorState) => {
        const childrenList = $getListContainingChildren(node5);
        expect ((node5.getParent() as ListNode).getChildrenSize()).toBe(2);
        expect (childrenList?.getChildrenSize()).toBe(1);
      }
    });
  });
  
});