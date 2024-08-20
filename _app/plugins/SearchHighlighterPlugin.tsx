import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { useSearchTerms } from '../context/search-terms-context';

export function SearchHighlighterPlugin({
  pageId
}: {
  pageId: string;
}): null {
  const [editor] = useLexicalComposerContext();
  const { getSearchTerms, deleteSearchTerms } = useSearchTerms();
  //const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const highlightSearchTerms = () => {
      const searchTerms = getSearchTerms(pageId);
      if (!searchTerms || searchTerms.length === 0) return;

      console.log('highlighting searchTerms:', searchTerms);

      // Clear existing highlights
      CSS.highlights?.clear();

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
      }
    };

    // Initial highlight
    highlightSearchTerms();

    // Set up MutationObserver to watch for changes in the editor
    //observerRef.current = new MutationObserver(highlightSearchTerms);
    //observerRef.current.observe(editorElement, { childList: true, subtree: true, characterData: true });

    return () => {
      if (getSearchTerms(pageId).length > 0) {
        console.log('clearing highlights', pageId);
        CSS.highlights?.clear();
      }
      //observerRef.current?.disconnect();
      
    };
  }, [editor, pageId, getSearchTerms, deleteSearchTerms]);

  return null;
}