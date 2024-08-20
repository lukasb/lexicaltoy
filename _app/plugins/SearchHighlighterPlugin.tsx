import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef, useCallback } from 'react';
import { useSearchTerms } from '../context/search-terms-context';

export function SearchHighlighterPlugin({
  pageId
}: {
  pageId: string;
}): null {
  const [editor] = useLexicalComposerContext();
  const { getSearchTerms, deleteSearchTerms } = useSearchTerms();
  //const observerRef = useRef<MutationObserver | null>(null);

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

      // Scroll the first result into view
      if (ranges[0]) {
        const firstElement = ranges[0].startContainer.parentElement;
        firstElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [pageId, getSearchTerms, editor]);

  useEffect(() => {
    // Initial highlight
    highlightSearchTerms();

    return () => {
      if (getSearchTerms(pageId).length > 0) {
        CSS.highlights?.clear();
      }
    };
  }, [editor, pageId, getSearchTerms, deleteSearchTerms, highlightSearchTerms]);

  return null;
}