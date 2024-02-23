import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { computePosition } from '@floating-ui/dom';
import { $getSelection } from 'lexical';
import { $getActiveListItem, $isListItemActive } from "@/app/lib/list-utils";
import { BaseSelection } from "lexical";
import { set } from "zod";

export type FloatingMenuCoords = { x: number; y: number } | undefined;

interface FloatingMenuConfig {
  component: React.ComponentType<any>;
  shouldShow: (selection: BaseSelection) => boolean;
  priority: number;
}

export function FloatingMenuPlugin({
    anchorElem = document.body,
    menuConfig,
  }: {
    anchorElem?: HTMLElement;
    menuConfig: FloatingMenuConfig[];
  }) 
  {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<FloatingMenuCoords>(undefined);
  const [visibleMenu, setVisibleMenu] = useState<FloatingMenuConfig | null>(null);
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
    if (!selection) {
      setCoords(undefined);
      return;
    }

    let newVisibleMenu: FloatingMenuConfig | null = null;
    for (const config of menuConfig) {
      if (config.shouldShow(selection)) {
        if (!newVisibleMenu || config.priority > newVisibleMenu.priority) {
          newVisibleMenu = config;
        }
      }
    }

    if (newVisibleMenu) {
      calculatePosition(selection);
      setVisibleMenu(newVisibleMenu);
    } else {
      setCoords(undefined); // Hide if no matching menu
      setVisibleMenu(null);
    }

  }, [editor, calculatePosition, menuConfig]);

  useEffect(() => {
    const unregisterListener = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => $handleSelectionChange());
      }
    );
    return unregisterListener;
  }, [editor, $handleSelectionChange]);

  return createPortal(
    visibleMenu ? (
      <visibleMenu.component ref={ref} editor={editor} coords={coords} />
    ) : null,
    anchorElem
  );
}
