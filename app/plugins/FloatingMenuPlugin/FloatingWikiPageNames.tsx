import React, {
  useState,
  useEffect,
  forwardRef,
  useContext,
  useCallback
} from "react";
import { searchPages } from "@/app/lib/pages-helpers";
import { Page } from "@/app/lib/definitions";
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
import { PagesContext } from "@/app/page/EditingArea";

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
  if (!$isTextNode(node) || !node.isSimpleText() || !$isAtNodeEnd(anchor)) {
    return [false, ""];
  }
  const searchText = [];
  const text = node.getTextContent();
  let i = node.getTextContentSize();
  let c;
  while (i-- && i >= 0 && (c = text[i]) !== "[") {
    searchText.push(c);
  }
  if (searchText.length === 0) {
    return [false, ""];
  }
  if (text[i] !== "[" || i === 0 || text[i - 1] !== "[") {
    return [false, ""];
  }
  return [true, searchText.reverse().join("")];
}

export async function computeFloatingWikiPageNamesPosition(
  editor: LexicalEditor,
  selection: BaseSelection,
  ref: React.RefObject<HTMLElement>
): Promise<FloatingMenuCoords> {
  // lexical selections don't let you get a range?
  const theSelection = window.getSelection();
  const range = theSelection?.getRangeAt(0);
  const rect = range?.getBoundingClientRect();

  const node = $getRoot();
  const editorState = editor.getEditorState();
  let startX = 0;
  let startY = 0;
  editorState.read(() => {
    const dom = editor.getElementByKey(node.__key);
    startX = dom?.getBoundingClientRect().left || 0;
    startY = dom?.getBoundingClientRect().top || 0;
  });
  if (!rect) return;
  // TODO figure out actual line height instead of hardcoding 30
  return { x: rect.left - startX || 0, y: rect.top - startY + 30 || 0 };
}

const FloatingWikiPageNames = forwardRef<HTMLDivElement, FloatingMenuProps>(
  ({ editor, coords }, ref) => {
    const [results, setResults] = useState<Page[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const pages = useContext(PagesContext);

    const shouldShow = coords !== undefined;

    const handleSelectSuggestion = (page: Page) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return;
        const [hasMatch, match] = $search(selection);
        if (!hasMatch) return;
        const remainingText = page.title.slice(match.length);
        selection.insertText(remainingText + "]]");
        resetSelf();
      });
    }

    const resetSelf = () => {
      setResults([]);
      setSelectedIndex(-1);
    };

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
            const filteredPages = searchPages(pages, match);
            setResults(filteredPages);
          });
        }
      );
      return unregisterListener;
    }, [editor]);

    useEffect(() => {
      console.log('Component mounted');
    
      return () => {
        console.log('Component unmounted');
      };
    }, []);

    const command = useCallback((keyboardEvent: React.KeyboardEvent, editor: LexicalEditor) => {
      if (keyboardEvent.key === "ArrowDown") {
        if (!shouldShow) return false;
        keyboardEvent.preventDefault();
        setSelectedIndex((prevIndex) =>
          Math.min(prevIndex + 1, results.length - 1)
        );
        return true;
      } else if (keyboardEvent.key === "ArrowUp") {
        if (!shouldShow) return false;
        keyboardEvent.preventDefault();
        setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        return true;
      } else if (keyboardEvent.key === "Enter") {
        if (!shouldShow) return false;
        if (selectedIndex > -1 && results.length > 0) {
          keyboardEvent.preventDefault();
          handleSelectSuggestion(results[selectedIndex]);
          resetSelf();
          return true;
        }
        return false;
      } else if (keyboardEvent.key === "Escape") {
        resetSelf();
        return true;
      }
      return false;
    }, [shouldShow, results, selectedIndex, handleSelectSuggestion, resetSelf]);
    
    useEffect(() => {
      if (!editor) return () => undefined;
      console.log("registering command");
      return editor.registerCommand(
        KEY_DOWN_COMMAND,
        command,
        COMMAND_PRIORITY_CRITICAL
      );
    }, [editor, command]);

    return (
      <div
        ref={ref}
        className="absolute z-10 bg-white shadow-md rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        aria-hidden={!shouldShow}
        style={{
          position: "absolute",
          top: coords?.y,
          left: coords?.x,
          visibility: shouldShow ? "visible" : "hidden",
          opacity: shouldShow ? 1 : 0,
        }}
      >
        <ul className="max-h-[400px] overflow-auto">
          {results.map((result, index) => (
            <li
              key={index}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
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
