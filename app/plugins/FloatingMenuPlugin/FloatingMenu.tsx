import { forwardRef, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND } from 'lexical';
import { $canIndent, $canOutdent } from '@/app/lib/list-utils';

export type FloatingMenuCoords = { x: number; y: number } | undefined;

type FloatingMenuState = {
  canIndent: boolean;
  canOutdent: boolean;
};

type FloatingMenuProps = {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  coords: FloatingMenuCoords;
};

export const FloatingMenu = forwardRef<HTMLDivElement, FloatingMenuProps>(
  function FloatingMenu(props, ref) {
    const { editor, coords } = props;

    const shouldShow = coords !== undefined;

    const [state, setState] = useState<FloatingMenuState>({
      canIndent: false,
      canOutdent: false,
    });

    useEffect(() => {
      const unregisterListener = editor.registerUpdateListener(
        ({ editorState }) => {
          editorState.read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            setState({
              canIndent: $canIndent(selection),
              canOutdent: $canOutdent(selection)
            });
          });
        }
      );
      return unregisterListener;
    }, [editor]);

    return (
      <div
      ref={ref}
      className="flex items-start px-2 py-1 rounded"
        aria-hidden={!shouldShow}
        style={{
            position: 'absolute',
            top: coords?.y,
            left: coords?.x,
            visibility: shouldShow ? 'visible' : 'hidden',
            opacity: shouldShow ? 1 : 0,
          }}
          >
      <button 
        aria-label="Outdent"
        className="px-3 py-1 mr-2 text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none" 
        disabled={!state.canOutdent}
        onClick={() => {
            editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
          }}
      >
        {'<'}
      </button>
      <button 
        aria-label="Indent"
        className="px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none" 
        disabled={!state.canIndent}
        onClick={() => {
            editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
          }}
      >
        {'>'}
      </button>
    </div>
    );
  }
);