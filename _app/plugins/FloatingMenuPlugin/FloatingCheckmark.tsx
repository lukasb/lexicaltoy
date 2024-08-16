import React, {
  useState,
  forwardRef,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  BaseSelection,
  $isRangeSelection,
  LexicalEditor,
  $getRoot,
} from "lexical";
import { FloatingMenuCoords, FloatingMenuProps } from ".";
import { $isFormulaEditorNode } from '@/_app/nodes/FormulaNode';
import { SWAP_FORMULA_EDITOR_FOR_DISPLAY } from "@/lib/formula-commands";

// TODO figure out actual line height instead of hardcoding 30
// this is copied from FloatingWikiPageNames.tsx should probably be shared
const editorLineHeight = 30;

export function shouldShowFloatingCheckmark(selection: BaseSelection) {
  if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const node = selection.getNodes()[0];
  if ($isFormulaEditorNode(node)) return true;
  return false;
}

// TODO duplicate code from FloatingWikiPageNames.tsx, refactor to share
export function computeFloatingCheckmarkPosition(
  editor: LexicalEditor,
  selection: BaseSelection,
  ref: React.RefObject<HTMLElement> | null
): FloatingMenuCoords {
  const position = computeFloatingCheckmarkPositionInternal(editor);
  if (!position) return { x: 0, y: 0 };
  const {cursorLeft, cursorTop, rootX, rootY} = position;
  let newX = cursorLeft - rootX;
  if (newX + 250 > window.innerWidth) {
    newX = window.innerWidth - 250;
  }
  return {
    x: newX,
    y: cursorTop - rootY + editorLineHeight
  };
}

// TODO duplicate code from FloatingWikiPageNames.tsx, refactor to share
function computeFloatingCheckmarkPositionInternal(editor: LexicalEditor) {
  // lexical selections don't let you get a range?
  const theSelection = window.getSelection();
  const range = theSelection?.getRangeAt(0);
  const rect = range?.getBoundingClientRect();

  const editorState = editor.getEditorState();
  let startX = 0;
  let startY = 0;
  editorState.read(() => {
    const node = $getRoot();
    const dom = editor.getElementByKey(node.__key);
    startX = dom?.getBoundingClientRect().left || 0;
    startY = dom?.getBoundingClientRect().top || 0;
  });
  if (!rect) return;

  return {
    cursorLeft: rect.left,
    cursorTop: rect.top,
    rootX: startX,
    rootY: startY 
  };
}

const FloatingCheckmark = forwardRef<HTMLDivElement, FloatingMenuProps>(
  ({ editor, coords }, ref) => {
    const [cancelled, setCancelled] = useState(false);
    const [position, setPosition] = useState({top: 0, left: 0});

    const shouldShow = coords !== undefined;

    const itemRefs = useRef<(React.RefObject<HTMLLIElement> | null)[]>([]);

    useEffect(() => {
      if (coords) {
        setPosition({top: coords.y, left: coords.x});
      }
    }, [coords]);

    const handleClick = useCallback(() => {
      editor.dispatchCommand(SWAP_FORMULA_EDITOR_FOR_DISPLAY, undefined);
    }, [editor]);

    return (
      <div
        ref={ref}
        className="absolute z-50"
        style={{
          top: position.top,
          left: position.left,
          display: shouldShow ? 'block' : 'none',
        }}
      >
        <button
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded"
          onClick={handleClick}
        >
          ✅ Done
        </button>
      </div>
    );
  }
);

FloatingCheckmark.displayName = "FloatingSlashCommands";
export default FloatingCheckmark;
