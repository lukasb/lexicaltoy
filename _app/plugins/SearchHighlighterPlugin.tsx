import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { useSearchTerms } from '../context/search-terms-context';

export function SearchHighlighterPlugin({
  pageId
}: {
  pageId: string;
}): null
 {
  const [editor] = useLexicalComposerContext();
  const { getSearchTerms } = useSearchTerms();

  useEffect(() => {
    setTimeout(() => {
      editor.read(() => {
        console.log('Editor loaded for pageId (read-only):', pageId);
        const searchTerms = getSearchTerms(pageId);
        if(searchTerms.length > 0) {
          console.log('highlighting searchTerms:', searchTerms);
        }
      });
    }, 0);

    return () => {
      console.log('unmounting search highlighter plugin', pageId);
    };
  }, [editor, pageId, getSearchTerms]);

  return null;
}