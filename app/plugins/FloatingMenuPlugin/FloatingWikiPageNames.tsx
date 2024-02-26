import React, {
  useState,
  useEffect,
  forwardRef,
  useContext,
} from "react";
import { searchPages } from "@/app/lib/pages-helpers";
import { Page } from "@/app/lib/definitions";
import {
  BaseSelection,
  $isRangeSelection,
  $isTextNode,
  LexicalEditor,
  $getSelection,
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

  return { x: rect?.left || 0, y: rect?.top || 0 };
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
            console.log("reading editor state");
            const selection = $getSelection();
            const [hasMatch, match] = $search(selection);
            if (!hasMatch) {
              resetSelf();
              return;
            }
            console.log("filtering pages");
            const filteredPages = searchPages(pages, match);
            setResults(filteredPages);
          });
        }
      );
      return unregisterListener;
    }, [editor]);

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
