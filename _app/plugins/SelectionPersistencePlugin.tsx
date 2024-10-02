import { useCallback, useRef, useEffect, useState } from 'react';
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  BLUR_COMMAND,
  FOCUS_COMMAND,
  RangeSelection,
  $isRangeSelection
} from "lexical";
import { useSavedSelection } from '@/_app/context/saved-selection-context';

export function SelectionPersistencePlugin(): null {
  const [editor] = useLexicalComposerContext();
  const { savedSelection, setSavedSelection } = useSavedSelection();
  const selectionOverlayRef = useRef<HTMLDivElement | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(true);

  const removeSelectionOverlay = useCallback(() => {
    if (selectionOverlayRef.current) {
      console.log("removing overlay");
      selectionOverlayRef.current.remove();
      selectionOverlayRef.current = null;
    }
  }, []);

  const createSelectionOverlay = useCallback((selection: RangeSelection) => {
    removeSelectionOverlay(); // Remove any existing overlay

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return;

    const range = domSelection.getRangeAt(0);
    const rects = range.getClientRects();

    console.log(rects);

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '9999';

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const highlight = document.createElement('div');
      highlight.style.position = 'absolute';
      highlight.style.left = `${rect.left + window.pageXOffset}px`;
      highlight.style.top = `${rect.top + window.pageYOffset}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
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
        $setSelection(savedSelection);
      });
    }
  }, [editor, savedSelection]);

  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const isOmnibar = (event.target as HTMLElement).id === 'omnibar-input';
      setIsEditorFocused(!isOmnibar);
      
      if (!isOmnibar) {
        restoreSelection();
        removeSelectionOverlay();
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [restoreSelection, removeSelectionOverlay]);

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
        if (isEditorFocused) {
          restoreSelection();
          removeSelectionOverlay();
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, restoreSelection, removeSelectionOverlay, isEditorFocused]);

  return null;
}