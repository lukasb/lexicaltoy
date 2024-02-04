import { EditorState, LexicalEditor, createEditor } from "lexical";
import { ListNode, ListItemNode, $createListNode, $createListItemNode } from "@lexical/list";
import { $getRoot, $createTextNode } from "lexical";
import { registerListCommands } from "./ListCommandsPlugin";
import { 
  DELETE_LISTITEM_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  INDENT_LISTITEM_COMMAND,
  OUTDENT_LISTITEM_COMMAND
} from '../lib/list-commands';

// TODO apparently updates are synchronous, so if we need a test that expects
// a comannd to not update the editor, we can disptach the command and follow it up
// with an update to force a reconciliation (rather than this expectTimeout nonsense)

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
  let childList: ListNode;
  let node1: ListItemNode;
  let node2: ListItemNode;
  let node3: ListItemNode;

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
      // - node3
      parentList = $createListNode("bullet");
      childList = $createListNode("bullet");
      node1 = $createListItemNode();
      node1.append($createTextNode("node1"));
      node2 = $createListItemNode();
      node2.append($createTextNode("node2"));
      node3 = $createListItemNode();
      node3.append($createTextNode("node3"));
      parentList.append(node1);
      parentList.append(childList);
      childList.append(node2);
      parentList.append(node3);
      $getRoot().append(parentList);
    });

    registerListCommands(editor);
  });

  test('DELETE_LISTITEM_COMMAND removes a non-nested item', async () => {
    await testEditorCommand({
      editor: editor,
      command: DELETE_LISTITEM_COMMAND,
      commandArgs: { listItem: node3 },
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
      commandArgs: { listItem: node2 },
      expectationFunction: (editorState) => {
        expect(parentList.getChildrenSize()).toBe(2);
        const secondChild = parentList.getChildren()[1] as ListItemNode;
        const textNode = secondChild.getChildren()[0];
        expect(textNode.getTextContent()).toBe("node3");
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
  
});