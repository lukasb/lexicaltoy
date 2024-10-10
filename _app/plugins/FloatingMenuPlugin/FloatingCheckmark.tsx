import React, {
  useState,
  forwardRef,
  useCallback,
  useEffect,
} from "react";
import {
  BaseSelection,
  $isRangeSelection,
  LexicalEditor,
  $getRoot,
  $getSelection,
} from "lexical";
import { createDOMRange } from "@lexical/selection";
import { FloatingMenuCoords, FloatingMenuProps } from ".";
import { $isFormulaEditorNode, FormulaEditorNode } from '@/_app/nodes/FormulaNode';
import { SWAP_FORMULA_EDITOR_FOR_DISPLAY } from "@/lib/formula-commands";

// TODO figure out actual line height instead of hardcoding 30
// this is copied from FloatingWikiPageNames.tsx should probably be shared
const editorLineHeight = 30;

const checkmarkWidth = 150;

function getEditorNodeFromSelection(selection: BaseSelection | null): FormulaEditorNode | null {
  if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  const node = selection.getNodes()[0];
  if ($isFormulaEditorNode(node)) return node;
  return null;
}

export function shouldShowFloatingCheckmark(selection: BaseSelection) {
  const editorNode = getEditorNodeFromSelection(selection);
  if (!editorNode) {
    console.log("no editor node");
    return false;
  }
  return true;
}

// TODO duplicate code from FloatingWikiPageNames.tsx, refactor to share
export function computeFloatingCheckmarkPosition(
  editor: LexicalEditor,
  selection: BaseSelection,
  ref: React.RefObject<HTMLElement> | null
): FloatingMenuCoords {
  const position = computeFloatingCheckmarkPositionInternal(editor);
  if (!position) {
    //console.log("no position");
    return { x: 0, y: 0 };
  } else {
    //console.log("position", position);
  }
  const {cursorLeft, cursorTop, rootX, rootY} = position;
  let newX = cursorLeft - rootX;
  if (newX + checkmarkWidth > window.innerWidth) {
    newX = window.innerWidth - checkmarkWidth;
  }
  return {
    x: newX,
    y: cursorTop - rootY + editorLineHeight
  };
}

// TODO duplicate code from FloatingWikiPageNames.tsx, refactor to share
function computeFloatingCheckmarkPositionInternal(editor: LexicalEditor) {
  // lexical selections don't let you get a range?
  //const theSelection = window.getSelection();
  const selection = $getSelection();
  if (!selection || !$isRangeSelection(selection))
  {
    console.log("problem with selection");
    return;
  }
  const range = createDOMRange(
    editor,
    selection.anchor.getNode(),
    selection.anchor.offset,
    selection.focus.getNode(),
    selection.focus.offset
  );

  const rect = range?.getBoundingClientRect();
  if (!rect) return;

  const editorState = editor.getEditorState();
  let startX = 0;
  let startY = 0;
  editorState.read(() => {
    const node = $getRoot();
    const dom = editor.getElementByKey(node.__key);
    startX = dom?.getBoundingClientRect().left || 0;
    startY = dom?.getBoundingClientRect().top || 0;
  });

  return {
    cursorLeft: rect.left,
    cursorTop: rect.top,
    rootX: startX,
    rootY: startY 
  };
}

const FloatingCheckmark = forwardRef<HTMLDivElement, FloatingMenuProps>(
  ({ editor, coords }, ref) => {
    const [position, setPosition] = useState({top: 0, left: 0});

    const shouldShow = coords !== undefined;

    useEffect(() => {
      if (coords) {
        setPosition({top: coords.y, left: coords.x});
      }
    }, [coords]);

    const handleClick = useCallback(() => {
      editor.read(() => {
        const selection = $getSelection();
        const editorNode = getEditorNodeFromSelection(selection);
        if (!editorNode) return;
        editor.dispatchCommand(SWAP_FORMULA_EDITOR_FOR_DISPLAY, {editorNodeKey: editorNode.getKey()});
      });
    }, [editor]);

    return (
      <div
        ref={ref}
        className="absolute z-50"
        style={{
          top: position.top,
          left: position.left,
          display: shouldShow && (position.top !== 0 || position.left !== 0) ? 'block' : 'none',
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
