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
    // Your plugin logic here
    // This will run when the editor is first initialized

    setTimeout(() => {
      editor.read(() => {
        console.log('Editor loaded for pageId (read-only):', pageId);
        const searchTerms = getSearchTerms(pageId);
        if(searchTerms.length > 0) {
          console.log('searchTerms:', searchTerms);
        }
      });
      editor.registerUpdateListener((editorState) => {
        console.log('editor updated, time to disable highlighting', pageId);
      });
    }, 0);

    // Cleanup function if needed
    return () => {
      // Cleanup logic
    };
  }, [editor, pageId]);

  return null;
}