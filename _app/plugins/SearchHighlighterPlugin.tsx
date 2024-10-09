import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef, useCallback } from 'react';
import { useSearchTerms } from '../context/search-terms-context';
import { COMMAND_PRIORITY_EDITOR, KEY_ESCAPE_COMMAND } from 'lexical';

export function SearchHighlighterPlugin({
  pageId
}: {
  pageId: string;
}): null {
  const [editor] = useLexicalComposerContext();
  const { getSearchTerms, deleteSearchTerms } = useSearchTerms();
  const alreadyMovedSelection = useRef(false);
  const clearedHighlights = useRef(false);

  const highlightSearchTerms = useCallback(() => {
    const searchTerms = getSearchTerms(pageId);
    if (!searchTerms || searchTerms.length === 0) return;

    CSS.highlights?.clear();

    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const ranges: Range[] = [];
    const treeWalker = document.createTreeWalker(editorElement, NodeFilter.SHOW_TEXT);

    let currentNode = treeWalker.nextNode();
    while (currentNode) {
      const text = currentNode.textContent?.toLowerCase() || '';
      searchTerms.forEach(term => {
        const termLower = term.toLowerCase();
        let startPos = 0;
        while (startPos < text.length) {
          const index = text.indexOf(termLower, startPos);
          if (index === -1) break;

          if (currentNode) {
            const range = new Range();
            range.setStart(currentNode, index);
            range.setEnd(currentNode, index + term.length);
            ranges.push(range);
          }

          startPos = index + term.length;
        }
      });
      currentNode = treeWalker.nextNode();
    }

    // Create a Highlight object for the ranges
    if (CSS.highlights && ranges.length > 0) {
      const searchResultsHighlight = new Highlight(...ranges);
      CSS.highlights.set("search-results", searchResultsHighlight);

      // Scroll the first result into view and select it
      if (!alreadyMovedSelection.current && ranges[0]) {
        const firstElement = ranges[0].startContainer.parentElement;
        firstElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Select the first result
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(ranges[0]);
        alreadyMovedSelection.current = true;
      }
    }
  }, [pageId, getSearchTerms, editor]);

  useEffect(() => {
    highlightSearchTerms();

    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (!clearedHighlights.current) {
          CSS.highlights?.clear();
          deleteSearchTerms(pageId);
          clearedHighlights.current = true;
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );

    return () => {
      if (getSearchTerms(pageId).length > 0) {
        CSS.highlights?.clear();
      }
    };
  }, [editor, pageId, getSearchTerms, deleteSearchTerms, highlightSearchTerms]);

  return null;
}