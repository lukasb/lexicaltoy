import { useEffect, useContext } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { PagesContext } from "../context/pages-context";
import { 
  $convertFromMarkdownString,
  TRANSFORMERS
} from "@lexical/markdown";
import { PageStatus } from "../lib/definitions";

export function PageListenerPlugin({
  pageId
}: {
  pageId: string;
}): null {
  const [editor] = useLexicalComposerContext();
  const pages = useContext(PagesContext);

  // make sure open editors update their contents when updates from shared nodes occur

  // TODO this is sort of race-y since FormulaPlugin is also listening for this PageStatus
  // and will change the status when it's done processing. we maybe should introduce another status
  // that we set here when we're done using the updated page value
  // (works so far though...)

  useEffect(() => {
    for (const page of pages) {
      if (page.id === pageId && page.status === PageStatus.EditFromSharedNodes) {
        if (editor.isEditable()) {
           editor.setEditable(false); // prevent focus stealing
        }
        editor.update(() => {
          $convertFromMarkdownString(page.value, TRANSFORMERS);
        });
      }
    }
  }, [editor, pageId, pages]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      if (!editor.isEditable()) {
          editor.setEditable(true);
      }
    });
  }, [editor, pageId]);

  return null;
}
