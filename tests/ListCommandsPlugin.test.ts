import { LexicalEditor, createEditor } from "lexical";
import { ListNode, ListItemNode, $createListNode, $createListItemNode } from "@lexical/list";
import { $getRoot } from "lexical";
import { registerListCommands } from "../app/plugins/ListCommandsPlugin";
import { 
  DELETE_LISTITEM_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  INDENT_LISTITEM_COMMAND,
  OUTDENT_LISTITEM_COMMAND
} from '../app/lib/list-commands';

async function testEditorCommand(
  editor: LexicalEditor,
  command: any,
  commandArgs: any,
  expectationFunction: (editorState: any) => void
) {
  const waitForUpdate = new Promise<void>((resolve, reject) => {
    const unregisterListener = editor.registerUpdateListener(({editorState}) => {
      try {
        editor.getEditorState().read(() => {
          expectationFunction(editorState);
        });
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        unregisterListener();
      }
    });
  });

  editor.dispatchCommand(command, commandArgs);
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
      node2 = $createListItemNode();
      node3 = $createListItemNode();
      parentList.append(node1);
      parentList.append(childList);
      childList.append(node2);
      parentList.append(node3);
      $getRoot().append(parentList);
    });

    registerListCommands(editor);
  });

  test('DELETE_LISTITEM_COMMAND removes a non-nested item', async () => {
    // Promisify the update listener
    const waitForUpdate = new Promise<void>((resolve, reject) => {
      const unregisterListener = editor.registerUpdateListener(({editorState}) => {
        try {
          editor.getEditorState().read(() => {
            expect(parentList.getChildrenSize()).toBe(2);
          });
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          unregisterListener();
        }
      });
    });
  
    editor.dispatchCommand(DELETE_LISTITEM_COMMAND, { listItem: node3 });
  
    // Wait for the update listener to be called
    await waitForUpdate;
  });
  
});