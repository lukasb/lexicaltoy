import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { $getSelection, LexicalEditor } from 'lexical';
import { BaseSelection } from "lexical";

export type FloatingMenuCoords = { x: number; y: number } | undefined;

interface FloatingMenuConfig {
  component: React.ComponentType<any>;
  shouldShow: (selection: BaseSelection) => boolean;
  computePosition: (editor: LexicalEditor, selection: BaseSelection, ref: React.RefObject<HTMLElement> | null) => Promise<FloatingMenuCoords>;
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

  const updateMenu = useCallback(
    async (
      selection: BaseSelection,
      menu: FloatingMenuConfig | null
    ) => {
      if (!selection) return setCoords(undefined);
      const coords = menu
        ? await menu.computePosition(editor, selection, ref)
        : undefined;
      setCoords(coords);
      setVisibleMenu(menu);
    },
    [editor]
  );

  const $handleEditorUpdate = useCallback(() => {
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
      updateMenu(selection, newVisibleMenu);
    } else {
      setCoords(undefined); // Hide if no matching menu
      setVisibleMenu(null);
    }

  }, [editor, updateMenu, menuConfig]);

  useEffect(() => {
    const unregisterListener = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => $handleEditorUpdate());
      }
    );
    return unregisterListener;
  }, [editor, $handleEditorUpdate]);

  return createPortal(
    visibleMenu ? (
      <visibleMenu.component ref={ref} editor={editor} coords={coords} />
    ) : null,
    anchorElem
  );
}
