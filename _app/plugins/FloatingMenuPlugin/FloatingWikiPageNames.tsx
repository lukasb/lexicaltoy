import React, {
  useState,
  useEffect,
  forwardRef,
  useContext,
  useCallback,
  useRef,
  createRef
} from "react";
import { searchPageTitles } from "@/lib/pages-helpers";
import { Page } from "@/lib/definitions";
import {
  BaseSelection,
  $isRangeSelection,
  $isTextNode,
  LexicalEditor,
  $getSelection,
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  KEY_DOWN_COMMAND
} from "lexical";
import { $isAtNodeEnd } from "@lexical/selection";
import { FloatingMenuCoords, FloatingMenuProps } from ".";
import { PagesContext } from "@/_app/context/pages-context";
import { isSmallWidthViewport } from "@/lib/window-helpers";
import { createDOMRange } from "@lexical/selection";
import { $isFormulaEditorNode } from "@/_app/nodes/FormulaNode";
import { $isFormattableTextNode } from "@/_app/nodes/FormattableTextNode";

// TODO figure out actual line height instead of hardcoding 30
const editorLineHeight = 30;
const menuLineHeight = 40;
const mobileMaxHeight = 100;
const desktopMaxHeight = 400;

export function shouldShowFloatingWikiPageNames(selection: BaseSelection) {
  if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const [hasMatch, match] = $search(selection);
  return hasMatch;
}

// tries to find "[[wikilink pagename" before the cursor
// returns [true, "wikilink pagename"] if it finds one
function $search(selection: null | BaseSelection): [boolean, string] {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return [false, ""];
  }
  const node = selection.getNodes()[0];
  const anchor = selection.anchor;
  // Check siblings?
  if (
    !$isTextNode(node) ||
    (!$isFormattableTextNode(node) && !$isFormulaEditorNode(node)) ||
    !$isAtNodeEnd(anchor)
  ) {
    return [false, ""];
  }
  const searchText = [];
  const text = node.getTextContent();
  let i = node.getTextContentSize();
  let c;
  while (i-- && i >= 0 && (c = text[i]) !== "[") {
    searchText.push(c);
  }
  if (text[i] !== "[" || i === 0 || text[i - 1] !== "[") {
    return [false, ""];
  }
  return [true, searchText.reverse().join("")];
}

export function computeFloatingWikiPageNamesPosition(
  editor: LexicalEditor,
  selection: BaseSelection,
  ref: React.RefObject<HTMLElement> | null
): FloatingMenuCoords {
  const position = computeFloatingWikiPageNamesPositionInternal(editor);
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

function computeFloatingWikiPageNamesPositionInternal(editor: LexicalEditor) {
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

const FloatingWikiPageNames = forwardRef<HTMLDivElement, FloatingMenuProps>(
  ({ editor, coords }, ref) => {
    const pages = useContext(PagesContext);
    const [results, setResults] = useState<Page[]>(pages);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cancelled, setCancelled] = useState(false);
    const [position, setPosition] = useState({top: coords?.y, left: coords?.x});

    const shouldShow = coords !== undefined;

    const itemRefs = useRef<(React.RefObject<HTMLLIElement> | null)[]>([]);

    const resetSelf = useCallback(() => {
      setResults([]);
      setSelectedIndex(-1);
    }, []);

    useEffect(() => {
      itemRefs.current = results.map((_, i) =>
        itemRefs.current[i] ?? createRef<HTMLLIElement>()
      );
    }, [results]);

    useEffect(() => {
      if (results.length > 0) {
        if (!editor) return;
        const positionVars = computeFloatingWikiPageNamesPositionInternal(editor);
        if (!positionVars) return;
        let newHeight = 0;
        let newTop = 0;
        // TODO well this sorta works to figure out the height ...
        if (isSmallWidthViewport(768)) {
          newHeight = Math.min(results.length * menuLineHeight, mobileMaxHeight);
        } else {
          newHeight = Math.min(results.length * menuLineHeight, desktopMaxHeight);
        }
        const spaceBelow = window.innerHeight - positionVars.cursorTop - window.scrollY;
        if (spaceBelow < newHeight) {
          newTop = positionVars.cursorTop - positionVars.rootY - newHeight - 10;
        } else {
          newTop = positionVars.cursorTop - positionVars.rootY + editorLineHeight;
        }
        setPosition({top: newTop, left: position.left});
      }
    }, [results, editor, position.left, position.top]);

    // Scroll the selected item into view when selectedIndex changes
    useEffect(() => {
      const selectedItemRef = itemRefs.current[selectedIndex];
      if (selectedItemRef?.current) {
        selectedItemRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, [selectedIndex]);

    const handleSelectSuggestion = useCallback((page: Page) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return;
        const [hasMatch, match] = $search(selection);
        if (!hasMatch) return;

        const {anchor, focus} = selection;
        // TODO handle case where beginning of wiki page name is before the node the selection is in
        const newAnchorOffset = Math.max(anchor.offset - match.length, 0);
        const range = createDOMRange(
          editor,
          anchor.getNode(),
          newAnchorOffset,
          focus.getNode(),
          focus.offset,
        );
        if (range) {
          selection.applyDOMRange(range);
          selection.removeText();
        }
        
        selection.insertText(page.title + "]]");
        resetSelf();
      });
    }, [editor, resetSelf]);

    useEffect(() => {
      const unregisterListener = editor.registerUpdateListener(
        ({ editorState }) => {
          editorState.read(() => {
            const selection = $getSelection();
            const [hasMatch, match] = $search(selection);
            if (!hasMatch) {
              resetSelf();
              return;
            }
            const filteredPages = searchPageTitles(pages, match);
            setResults(filteredPages);
          });
        }
      );
      return unregisterListener;
    }, [editor, pages, resetSelf]);

    // we're doing this to memoize state (results, shouldShow etc)
    // component was being mounted twice and the second time it didn't have the right state
    // TODO figure out why

    const command = useCallback((keyboardEvent: React.KeyboardEvent, editor: LexicalEditor) => {
      if (keyboardEvent.key === "ArrowDown") {
        if (!shouldShow || cancelled) return false;
        keyboardEvent.preventDefault();
        setSelectedIndex((prevIndex) =>
          Math.min(prevIndex + 1, results.length - 1)
        );
        return true;
      } else if (keyboardEvent.key === "ArrowUp") {
        if (!shouldShow || cancelled) return false;
        keyboardEvent.preventDefault();
        setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        return true;
      } else if (keyboardEvent.key === "Enter") {
        if (!shouldShow || cancelled) return false;
        if (selectedIndex > -1 && results.length > 0) {
          keyboardEvent.preventDefault();
          handleSelectSuggestion(results[selectedIndex]);
          resetSelf();
          return true;
        }
        return false;
      } else if (keyboardEvent.key === "Escape") {
        if (!shouldShow || cancelled) return false;
        setCancelled(true);
        resetSelf();
        return true;
      }
      return false;
    }, [shouldShow, results, selectedIndex, handleSelectSuggestion, resetSelf, cancelled]);
    
    useEffect(() => {
      if (!editor) return () => undefined;
      return editor.registerCommand(
        KEY_DOWN_COMMAND,
        command,
        COMMAND_PRIORITY_CRITICAL
      );
    }, [editor, command]);

    // TODO don't hardcode max heights below
    return (
      <div
        ref={ref}
        className="absolute bg-white shadow-md rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white z-40"
        aria-hidden={!shouldShow}
        style={{
          position: "absolute",
          top: position.top ? position.top : coords?.y,
          left: position.left ? position.left: coords?.x,
          visibility: shouldShow ? "visible" : "hidden",
          opacity: shouldShow ? 1 : 0,
          minWidth: "250px"
        }}
      >
        <ul className="max-h-[200px] md:max-h-[400px] overflow-auto">
          {results.map((result, index) => (
            <li
              key={index}
              ref={itemRefs.current[index]}
              className={`px-4 py-2 cursor-pointer floatingui hover:bg-gray-200 dark:hover:bg-gray-700 ${
                selectedIndex === index
                  ? "selected-item bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              onClick={() => handleSelectSuggestion(result)}
            >
              {result.title}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);

FloatingWikiPageNames.displayName = "FloatingWikiPageNames";
export default FloatingWikiPageNames;
