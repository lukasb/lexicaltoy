import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { $getSelection, LexicalEditor } from 'lexical';
import { BaseSelection } from "lexical";

export type FloatingMenuCoords = { x: number; y: number } | undefined;

interface FloatingMenuConfig {
  component: React.ComponentType<any>;
  shouldShow: (selection: BaseSelection) => boolean;
  computePosition: (editor: LexicalEditor, selection: BaseSelection, ref: React.RefObject<HTMLElement>) => Promise<FloatingMenuCoords>;
  priority: number;
}

export type FloatingMenuProps = {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  coords: FloatingMenuCoords;
};

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

  const calculatePosition = useCallback(
    async (
      selection: BaseSelection,
      currentVisibleMenu: FloatingMenuConfig | null
    ) => {
      if (!selection || !ref.current) return setCoords(undefined);
      const coords = currentVisibleMenu
        ? await currentVisibleMenu.computePosition(editor, selection, ref)
        : undefined;
      setCoords(coords);
    },
    [editor]
  );

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
      console.log(`newVisibleMenu: ${newVisibleMenu}`);
      setVisibleMenu(newVisibleMenu);
      calculatePosition(selection, newVisibleMenu);
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

  useEffect(() => {
    console.log('Plugin mounted');
  
    return () => {
      console.log('Plugin unmounted');
    };
  }, []);

  return createPortal(
    visibleMenu ? (
      <visibleMenu.component ref={ref} editor={editor} coords={coords} />
    ) : null,
    anchorElem
  );
}
