import { useCallback, useRef, useEffect, useState } from 'react';
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  BLUR_COMMAND,
  FOCUS_COMMAND,
  RangeSelection,
  $isRangeSelection,
  $getRoot
} from "lexical";
import { useSavedSelection } from '@/_app/context/saved-selection-context';

export function SelectionPersistencePlugin(): null {
  const [editor] = useLexicalComposerContext();
  const { savedSelection, setSavedSelection } = useSavedSelection();
  const selectionOverlayRef = useRef<HTMLDivElement | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(true);

  const removeSelectionOverlay = useCallback(() => {
    if (selectionOverlayRef.current) {
      selectionOverlayRef.current.remove();
      selectionOverlayRef.current = null;
    }
  }, []);

  const createSelectionOverlay = useCallback((selection: RangeSelection) => {
    removeSelectionOverlay();

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return;

    const range = domSelection.getRangeAt(0);
    const rects = range.getClientRects();

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '9999';

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const highlight = document.createElement('div');
      highlight.style.position = 'absolute';
      highlight.style.left = `${rect.left + window.scrollX}px`;
      highlight.style.top = `${rect.top + window.scrollY}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
      highlight.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
      overlay.appendChild(highlight);
    }

    document.body.appendChild(overlay);
    selectionOverlayRef.current = overlay;
  }, [removeSelectionOverlay]);

  const saveSelection = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setSavedSelection(selection.clone());
        createSelectionOverlay(selection);
      }
    });
  }, [editor, setSavedSelection, createSelectionOverlay]);

  const restoreSelection = useCallback(() => {
    if (savedSelection) {
      editor.update(() => {
        $setSelection(savedSelection.clone());
      });
    }
  }, [editor, savedSelection]);

  useEffect(() => {
    return editor.registerCommand(
      BLUR_COMMAND,
      () => {
        saveSelection();
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, saveSelection]);

  useEffect(() => {
    return editor.registerCommand(
      FOCUS_COMMAND,
      () => {
        if (
          editor.isComposing() ||
          editor.getRootElement() !== document.activeElement
        ) {
          return false;
        }
        
        restoreSelection();
        removeSelectionOverlay();

        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, restoreSelection, removeSelectionOverlay]);

  return null;
}