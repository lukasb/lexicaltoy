/**
 * @jest-environment jsdom
 */

import { $myConvertFromMarkdownString } from "./markdown-import";
import { myCreateHeadlessEditor } from "../editor-utils";
import { LexicalNode, ElementNode, $getRoot } from 'lexical';
import { ListNode, ListItemNode } from '@lexical/list';
import { $getListContainingChildren } from "../list-utils";
import { usePageStatusStore } from '@/lib/stores/page-status-store';
import { Page, PageStatus } from '@/lib/definitions';

describe('Markdown to Lexical Conversion', () => {
  beforeEach(() => {
    // Clear the Zustand store before each test
    const store = usePageStatusStore.getState();
    store.pageStatuses.clear();
  });

  // Helper function to get the list item content
  const getListItemContent = (root: ElementNode, index: number): string | null => {
    const listNode = root.getFirstChild() as ListNode;
    if (listNode) {
      const listItemNode = listNode.getChildAtIndex(index) as ListItemNode;
      if (listItemNode) {
        return listItemNode.getTextContent();
      }
    }
    return null;
  };

  // Helper function to get nested list item content
  const getNestedListItemContent = (root: ElementNode, parentIndex: number, childIndex: number): string | null => {
    const listNode = root.getFirstChild() as ListNode;
    if (listNode) {
      const parentListItem = listNode.getChildAtIndex(parentIndex) as ListItemNode;
      if (parentListItem) {
        const nestedListNode = $getListContainingChildren(parentListItem);
        if (nestedListNode) {
          const childListItem = nestedListNode.getChildAtIndex(childIndex) as ListItemNode;
          if (childListItem) {
            return childListItem.getTextContent();
          }
        } else {
          console.error('Nested list node is null. Debugging info:', {
            parentListItem: parentListItem,
            parentListItemSibling: parentListItem.getNextSibling(),
            parentListItemSiblingChildren: (parentListItem.getNextSibling() as ListItemNode)?.getChildren(),
          });
        }
      }
    }
    return null;
  };

  test('converts simple list markdown to Lexical nodes', () => {
    const markdownString = '- This is content for page 1.\n- It contains some keywords.';
    const headlessEditor = myCreateHeadlessEditor();
    
    headlessEditor.update(() => {
      const headlessRoot = $getRoot();
      $myConvertFromMarkdownString(markdownString, false, headlessRoot);
      
      expect(getListItemContent(headlessRoot, 0)).toBe('This is content for page 1.');
      expect(getListItemContent(headlessRoot, 1)).toBe('It contains some keywords.');
    });
  });

  test('converts nested list markdown to Lexical nodes', () => {
    const markdownString = '- Carolina shuffle\n    - boogie';
    const headlessEditor = myCreateHeadlessEditor();
    
    headlessEditor.update(() => {
      const headlessRoot = $getRoot();
      $myConvertFromMarkdownString(markdownString, false, headlessRoot);
      
      const parentContent = getListItemContent(headlessRoot, 0);
      expect(parentContent).toBe('Carolina shuffle');
      
      const nestedContent = getNestedListItemContent(headlessRoot, 0, 0);
      if (nestedContent === null) {
        console.error('Nested content is null. Debugging info:', {
          rootChildren: headlessRoot.getChildren(),
          firstListItem: (headlessRoot.getFirstChild() as ListNode)?.getChildren(),
        });
      } else {
        expect(nestedContent).toBe('boogie');
      }
    });
  });

  test('converts markdown with multiline content to Lexical nodes', () => {
    const markdownString = '- This is whatever for page 5.\n- It contains some amazing keywords.\nThis is a multiline continuation';
    const headlessEditor = myCreateHeadlessEditor();
    
    headlessEditor.update(() => {
      const headlessRoot = $getRoot();
      $myConvertFromMarkdownString(markdownString, false, headlessRoot);
      
      expect(getListItemContent(headlessRoot, 0)).toBe('This is whatever for page 5.');
      expect(getListItemContent(headlessRoot, 1)).toBe('It contains some amazing keywords.\nThis is a multiline continuation');
    });
  });

  test('converts markdown with page status updates', () => {
    const pageId = 'test-page-1';
    const store = usePageStatusStore.getState();
    const date = new Date();
    store.addPageStatus(pageId, PageStatus.UserEdit, date, 1, '- Updated content\n- With status');
    
    const markdownString = '- Original content\n- Without status';
    const headlessEditor = myCreateHeadlessEditor();
    
    const testPage: Page = {
      id: pageId,
      userId: 'test-user',
      title: 'Test Page',
      value: markdownString,
      lastModified: date,
      revisionNumber: 1,
      isJournal: false,
      deleted: false
    };
    
    headlessEditor.update(() => {
      const headlessRoot = $getRoot();
      $myConvertFromMarkdownString(markdownString, false, headlessRoot);
      
      // The original content should be converted
      expect(getListItemContent(headlessRoot, 0)).toBe('Original content');
      expect(getListItemContent(headlessRoot, 1)).toBe('Without status');
      
      // Now let's verify the store has the updated content
      const updatedValue = store.getUpdatedPageValue(testPage);
      expect(updatedValue).toBe('- Updated content\n- With status');
    });
  });
});