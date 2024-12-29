import React, {
  useState,
  useEffect,
  forwardRef,
  useContext,
  useCallback,
  useRef,
  createRef
} from "react";
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
import { possibleArguments } from "@/lib/formula/formula-parser";
import { FormulaValueType } from "@/lib/formula/formula-definitions";
import { useBlockIdsIndex } from "@/_app/context/page-blockids-index-context";
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from 'react-virtualized';

// TODO figure out actual line height instead of hardcoding 30
const editorLineHeight = 30;
const menuLineHeight = 40;
const mobileMaxHeight = 200;
const desktopMaxHeight = 600;

const LIST_WIDTH = 250; // Matches minWidth from the component style

type WikilinkResult = {
  title: string;
  description?: string;
  showTop?: boolean;
}

export function searchPageTitles(potentialResults: WikilinkResult[], term: string): WikilinkResult[] {
  const normalizedTerm = term.toLowerCase();
  const exactMatch: WikilinkResult[] = [];
  const topResults: WikilinkResult[] = [];
  const startsWithTerm: WikilinkResult[] = [];
  const includesTerm: WikilinkResult[] = [];

  for (const potentialResult of potentialResults) {
    const normalizedTitle = potentialResult.title.toLowerCase();
    if (normalizedTitle === normalizedTerm) {
      exactMatch.push(potentialResult);
    } else if (potentialResult.showTop) {
      topResults.push(potentialResult);
    } else if (normalizedTitle.startsWith(normalizedTerm)) {
      startsWithTerm.push(potentialResult);
    } else if (normalizedTitle.includes(normalizedTerm)) {
      includesTerm.push(potentialResult);
    }
  }

  return [...exactMatch, ...topResults, ...startsWithTerm, ...includesTerm];
}

export function shouldShowFloatingWikiPageNames(selection: BaseSelection) {
  if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const [hasMatch, match, inFormula] = $search(selection);
  return hasMatch;
}

// tries to find "[[wikilink pagename" before the cursor
// returns [true, "wikilink pagename", inFormula] if it finds one
// inFormula is true if the wikilink is inside a formula
function $search(selection: null | BaseSelection): [boolean, string, boolean] {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return [false, "", false];
  }
  const node = selection.getNodes()[0];
  const anchor = selection.anchor;
  let inFormula = false;
  // Check siblings?
  if (
    !$isTextNode(node) ||
    (!$isFormattableTextNode(node) && !$isFormulaEditorNode(node)) ||
    !$isAtNodeEnd(anchor)
  ) {
    return [false, "", false];
  } else if ($isFormulaEditorNode(node)) {
    inFormula = true;
  }
  const searchText = [];
  const text = node.getTextContent();
  let i = node.getTextContentSize();
  let c;
  
  while (i-- && i >= 0 && (c = text[i]) !== "[") {
    if (text[i] === "]" && i > 0 && text[i - 1] === "]") {
      return [false, "", false];
    }
    searchText.push(c);
  }
  if (text[i] !== "[" || i === 0 || text[i - 1] !== "[") {
    return [false, "", false];
  }
  return [true, searchText.reverse().join(""), inFormula];
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
    const [results, setResults] = useState<WikilinkResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cancelled, setCancelled] = useState(false);
    const [position, setPosition] = useState({top: coords?.y, left: coords?.x});
    const { getPagesWithBlockIds, getBlockIdsForPage } = useBlockIdsIndex();

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

    const handleSelectSuggestion = useCallback((result: WikilinkResult) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return;
        const [hasMatch, match, inFormula] = $search(selection);
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
        
        selection.insertText(result.title + "]]");
        resetSelf();
      });
    }, [editor, resetSelf]);

    // Extract the result updating logic into a separate function
    const updateResults = useCallback((match: string, inFormula: boolean) => {
      let searchResults: WikilinkResult[] = [];
      const potentialResults: WikilinkResult[] = pages.map(page => ({title: page.title}));

      // get the list of pages that have block ids
      for (const pageWithBlockIds of getPagesWithBlockIds()) {
        const blockIds = getBlockIdsForPage(pageWithBlockIds);
        if (!blockIds) continue;
        const index = potentialResults.findIndex(page => page.title === pageWithBlockIds);
        if (index !== -1) {
          for (let i = 1; i <= blockIds.length; i++) {
            potentialResults.splice(index + i, 0, {
              title: pageWithBlockIds + "#" + blockIds[i - 1]
            });
          }
        }
      }

      if (inFormula) {
        const formulaArguments = possibleArguments
          .filter(arg => 
            arg.type === FormulaValueType.Wikilink
            && arg.displayName !== "wikilink"
            && (arg.shouldShow ? arg.shouldShow(match) : true)
          )
          .map(arg => ({ 
            title: arg.nameDisplayHelper ? arg.nameDisplayHelper(match) : arg.displayName,
            description: arg.descriptionDisplayHelper ? arg.descriptionDisplayHelper(match) : arg.description,
            showTop: true
          }));
        potentialResults.unshift(...formulaArguments);
      }
      if (match !== "") {
        searchResults = searchPageTitles(potentialResults, match);
      } else {
        searchResults = potentialResults;
      }
      setResults(searchResults);
    }, [pages, getBlockIdsForPage, getPagesWithBlockIds]);

    useEffect(() => {
      if (shouldShow && editor) {
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          const [hasMatch, match, inFormula] = $search(selection);
          if (hasMatch) {
            updateResults(match, inFormula);
          }
        });
      }
    }, [shouldShow, editor, updateResults]);

    useEffect(() => {
      const unregisterListener = editor.registerUpdateListener(
        ({ editorState }) => {
          editorState.read(() => {
            const selection = $getSelection();
            const [hasMatch, match, inFormula] = $search(selection);
            if (!hasMatch) {
              resetSelf();
              return;
            }
            updateResults(match, inFormula);
          });
        }
      );
      return unregisterListener;
    }, [editor, updateResults, resetSelf]);

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

    // Add cache for cell measurements
    const cache = useRef(
      new CellMeasurerCache({
        fixedWidth: true,
        minHeight: 50,
      })
    );

    // Reset cache when results change
    useEffect(() => {
      cache.current.clearAll();
    }, [results]);

    const rowRenderer = ({ index, key, parent, style }: any) => {
      const result = results[index];
      
      return (
        <CellMeasurer
          cache={cache.current}
          columnIndex={0}
          key={key}
          parent={parent}
          rowIndex={index}
        >
          {({ measure, registerChild }) => (
            <li
              ref={(el) => {
                if (typeof registerChild === 'function') {
                  registerChild(el as Element | undefined);
                }
                if (itemRefs.current) {
                  itemRefs.current[index] = { current: el };
                }
              }}
              style={{
                ...style,
                listStyle: 'none',
                padding: '8px 16px', // Consistent padding
              }}
              className={`cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                selectedIndex === index ? "selected-item bg-gray-200 dark:bg-gray-700" : ""
              }`}
              onClick={() => handleSelectSuggestion(result)}
            >
              <div className="flex flex-col justify-center min-h-[36px]">
                <div className="text-base">{result.title}</div>
                {result.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {result.description}
                  </div>
                )}
              </div>
            </li>
          )}
        </CellMeasurer>
      );
    };

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
          minWidth: LIST_WIDTH
        }}
      >
        <div style={{ height: Math.min(results.length * 50, isSmallWidthViewport(768) ? mobileMaxHeight : desktopMaxHeight) }}>
          <List
            height={Math.min(results.length * 50, isSmallWidthViewport(768) ? mobileMaxHeight : desktopMaxHeight)}
            width={LIST_WIDTH}
            rowCount={results.length}
            rowHeight={cache.current.rowHeight}
            deferredMeasurementCache={cache.current}
            rowRenderer={rowRenderer}
            scrollToIndex={selectedIndex}
            className="overflow-auto"
          />
        </div>
      </div>
    );
  }
);

FloatingWikiPageNames.displayName = "FloatingWikiPageNames";
export default FloatingWikiPageNames;