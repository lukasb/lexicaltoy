import { forwardRef, useEffect, useState } from "react";
import { $getSelection, $isRangeSelection, BaseSelection, LexicalEditor } from "lexical";
import { $canIndent, $canOutdent } from "@/lib/list-utils";
import {
  INDENT_LISTITEM_COMMAND,
  OUTDENT_LISTITEM_COMMAND,
} from "@/lib/list-commands";
import { $getActiveListItemFromSelection, $isListItemActive } from "@/lib/list-utils";
import { ListItemNode } from "@lexical/list";
import { FloatingMenuCoords, FloatingMenuProps } from "./index";
import { computePosition } from '@floating-ui/dom';

type FloatingMenuState = {
  canIndent: boolean;
  canOutdent: boolean;
  listItem: ListItemNode | null;
};

// show if selection is on a list item
export function shouldShowFloatingIndentButtons(selection: BaseSelection) {
  return (selection && $isListItemActive(selection)) || false;
}

export async function computeFloatingIndentButtonsPosition(
  editor: LexicalEditor,
  selection: BaseSelection,
  ref: React.RefObject<HTMLElement> | null
): Promise<FloatingMenuCoords> {

  const listItem = $getActiveListItemFromSelection(selection);
  if (!listItem || !ref || !ref.current) return undefined;

  const listItemDOM = editor.getElementByKey(
    listItem.getKey()
  ) as HTMLLIElement;

  // Use async/await to wait for the promise to resolve.
  try {
    const pos = await computePosition(listItemDOM, ref.current, { placement: "bottom-end" });
    const coords = { x: pos.x, y: pos.y + 10 };
    return coords;
  } catch (error) {
    return undefined;
  }
}

const FloatingIndentButtons = forwardRef<HTMLDivElement, FloatingMenuProps>(({ editor, coords }, ref) => {

    const shouldShow = coords !== undefined;

    const [state, setState] = useState<FloatingMenuState>({
      canIndent: false,
      canOutdent: false,
      listItem: null,
    });

    useEffect(() => {
      const unregisterListener = editor.registerUpdateListener(
        ({ editorState }) => {
          editorState.read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            const listItem = $getActiveListItemFromSelection(selection);

            setState({
              canIndent: $canIndent(selection),
              canOutdent: $canOutdent(selection),
              listItem,
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
          position: "absolute",
          top: coords?.y,
          left: coords?.x,
          visibility: shouldShow ? "visible" : "hidden",
          opacity: shouldShow ? 1 : 0,
        }}
      >
        <button
          aria-label="Outdent"
          className="px-3 py-1 mr-2 text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none"
          disabled={!state.canOutdent}
          onClick={() => {
            const listItem = state.listItem;
            if (listItem === null) return;
            editor.dispatchCommand(OUTDENT_LISTITEM_COMMAND, {listItem});
          }}
        >
          {"<"}
        </button>
        <button
          aria-label="Indent"
          className="px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none"
          disabled={!state.canIndent}
          onClick={() => {
            const listItem = state.listItem;
            if (listItem === null) return;
            editor.dispatchCommand(INDENT_LISTITEM_COMMAND, {listItem});
          }}
        >
          {">"}
        </button>
      </div>
    );
});

FloatingIndentButtons.displayName = "FloatingIndentButtons";

export default FloatingIndentButtons;