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

  useEffect(() => {
    for (const page of pages) {
      if (page.id === pageId && page.status === PageStatus.EditFromSharedNodes) {
        editor.setEditable(false); // prevent focus stealing
        editor.update(() => {
          $convertFromMarkdownString(page.value, TRANSFORMERS);
        });
      }
    }
  }, [editor, pageId, pages]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.update(() => {
        if (!editor.isEditable()) {
          editor.setEditable(true);
        }
      });
    });
  }, [editor]);

  return null;
}
