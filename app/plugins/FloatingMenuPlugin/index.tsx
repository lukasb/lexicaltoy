import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { computePosition } from '@floating-ui/dom';
import { $getSelection } from 'lexical';

import { FloatingMenu, FloatingMenuCoords } from "./FloatingMenu";
import { $getActiveListItem, $isListItemActive } from "@/app/lib/list-utils";
import { BaseSelection } from "lexical";

import { createDOMRange } from '@lexical/selection';

export function FloatingMenuPlugin({
    anchorElem = document.body,
  }: {
    anchorElem?: HTMLElement;
  }) 
  {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<FloatingMenuCoords>(undefined);
  const [editor] = useLexicalComposerContext();

  const calculatePosition = useCallback((selection: BaseSelection) => {

    if (!selection || !ref.current) return setCoords(undefined);

    const listItem = $getActiveListItem(selection);
    if (!listItem) return setCoords(undefined);
    const listItemDOM = editor.getElementByKey(listItem.getKey()) as HTMLLIElement;

    computePosition(listItemDOM, ref.current, { placement: "bottom-end" })
      .then((pos) => {
        console.log('pos', pos);
        setCoords({ x: pos.x, y: pos.y + 10 });
      })
      .catch(() => {
        setCoords(undefined);
      });
  }, []);

  const $handleSelectionChange = useCallback(() => {
    if (
      editor.isComposing() ||
      editor.getRootElement() !== document.activeElement
    ) {
      setCoords(undefined);
      return;
    }

    const selection = $getSelection();

    if ($isListItemActive(selection)) {
      calculatePosition(selection);
    } else {
      setCoords(undefined);
    }
  }, [editor, calculatePosition]);

  useEffect(() => {
    const unregisterListener = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => $handleSelectionChange());
      }
    );
    return unregisterListener;
  }, [editor, $handleSelectionChange]);

  return createPortal(
    <FloatingMenu ref={ref} editor={editor} coords={coords} />,
    anchorElem
  );
}
