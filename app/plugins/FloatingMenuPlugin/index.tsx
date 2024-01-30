import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { computePosition } from '@floating-ui/dom';
import { $getSelection } from 'lexical';

import { FloatingMenu, FloatingMenuCoords } from "./FloatingMenu";
import { $isListItemActive } from "@/app/lib/list-utils";

export function FloatingMenuPlugin({
    anchorElem = document.body,
  }: {
    anchorElem?: HTMLElement;
  }) 
  {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<FloatingMenuCoords>(undefined);
  const [editor] = useLexicalComposerContext();

  const calculatePosition = useCallback(() => {
    const domSelection = getSelection();
    const domRange =
      domSelection?.rangeCount !== 0 && domSelection?.getRangeAt(0);

    if (!domRange || !ref.current) return setCoords(undefined);

    computePosition(domRange, ref.current, { placement: "bottom" })
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
      calculatePosition();
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
