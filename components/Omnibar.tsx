"use client";

import React, { 
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useContext
} from "react";
import { Page } from "@/lib/definitions";
import { PagesContext } from "@/_app/context/pages-context";
import { isTouchDevice } from "@/lib/window-helpers";
import { getTodayJournalTitle } from "@/lib/journal-helpers";
import { getModifierKey } from "@/lib/utils";
import { useBreakpoint } from "@/lib/window-helpers";
import { highlightText } from "@/lib/text-helpers";
import { useSearchTerms } from "@/_app/context/search-terms-context";
import { useMiniSearch } from "@/_app/context/minisearch-context";
import { FixedSizeList as List } from 'react-window';
import { useClickOutside } from "@/lib/window-helpers";

// TODO probably we can refactor this, see https://react.dev/learn/you-might-not-need-an-effect

const Omnibar = forwardRef(({
  openOrCreatePageByTitle
}: { 
  openOrCreatePageByTitle: (title: string) => void;
}, ref) => {

  const omnibarRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState(""); // the actual user input
  const [results, setResults] = useState<Page[]>([]);
  const [displayValue, setDisplayValue] = useState(""); // the displayed value
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCreatePageOption, setShowCreatePageOption] = useState(false);
  const [showPageContent, setShowPageContent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ulRef = useRef<HTMLUListElement>(null);
  const skipTermResolutionRef = useRef(false);
  const skipDisplayValueResolutionRef = useRef(false);
  const pages = useContext(PagesContext);
  const [todayJournalTitle, setTodayJournalTitle] = useState(getTodayJournalTitle());
  const [modifierKey, setModifierKey] = useState("");
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const storedTermRef = useRef("");
  const { searchTermsMap, setSearchTerms, getSearchTerms } = useSearchTerms();
  const filteredPagesRef = useRef<Page[]>([]);
  const { miniSearch } = useMiniSearch();
  const listRef = useRef<List>(null);

  type SearchResult = { id: string; [key: string]: any };

  // TODO logic should match searchPages in pages-helpers
  const handleSearch = useCallback(async (term: string): Promise<Page[]> => {
    
    if (miniSearch) {
      
      const results = miniSearch.search(
        term, 
        { 
          prefix: true, 
          boost: { title: 2 },
          combineWith: 'AND',
        });
      console.log('Search results count:', results.length);

      const pagesMap = new Map(pages.map(page => [page.id, page]));
      const filteredResults = results
        .map((result: SearchResult) => pagesMap.get(result.id))
        .filter((page): page is Page => page !== undefined)
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      return filteredResults;
    }
    return [];
  }, [pages, miniSearch]);

  useEffect(() => {
    setModifierKey(getModifierKey());
  }, []);

  useBreakpoint(768, isMobile, setIsMobile);

  // TODO accessibility
  // TODO Escape sets focus back to last active editor

  const showReverseChronologicalList = useCallback(() => {
    setResults(pages.sort((a, b) => {
      const dateA = new Date(a.lastModified);
      const dateB = new Date(b.lastModified);
      return dateB.getTime() - dateA.getTime();
    }));
  }, [pages]);

  // this is used to give the parent component access to the focus method
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    const handleFocus = () => {
      if (term === "") { 
        skipTermResolutionRef.current = true;
        showReverseChronologicalList();
      }
    };
  
    const inputElement = inputRef.current; // Capture the value, which might change if there's a re-render between setup and cleanup  
    inputElement?.addEventListener('focus', handleFocus);
  
    return () => {
      inputElement?.removeEventListener('focus', handleFocus);
    };
  }, [term, showReverseChronologicalList]); 
  
  // this useEffect checks to see if the user's search term is a match for a page title
  // say the user types "auto" and there's a page called "automobile"
  // in this case, we set the displayed text of the omnibar (displayValue) to "automobile"
  // see the next useEffect for some remaining display logic
  useEffect(() => {
    const searchPagesAsync = async () => {
      if (skipTermResolutionRef.current === true) {
        skipTermResolutionRef.current = false;
        return;
      }
  
      if (term) {
        const filteredPages = await handleSearch(term);
        filteredPagesRef.current = filteredPages;
        const startMatch = filteredPages.find((page) =>
          page.title.toLowerCase().startsWith(term.toLowerCase())
        );
        
        if (startMatch && inputRef.current) {
          setDisplayValue(startMatch.title);
        } else {
          setDisplayValue(term);
        }
        
        setResults(filteredPages);
      } else {
        resetSelf();
      }
    };
  
    searchPagesAsync();
  }, [term, pages, handleSearch]);

  // this useEffect checks to see if the search term the user typed (term) and the actual text in the omnibar (displayValue) are different
  // say the user types "auto" and the omnibar displays "automobile"
  // in this case, we want to select the text "mobile" in the omnibar - this is basically the same behavior as the Chrome omnibar
  // we also set the selected index for the results list
  useEffect(() => {
    const searchPagesAsync = async () => {
      if (skipDisplayValueResolutionRef.current === true) {
        skipDisplayValueResolutionRef.current = false;
        return;
      }

      const filteredPages = filteredPagesRef.current;
      const exactMatchIndex = filteredPages.findIndex(
        (page) => page.title.toLowerCase() === displayValue.toLowerCase()
      );
  
      if (inputRef.current && exactMatchIndex !== -1) {
        if (displayValue !== term && displayValue.toLowerCase().startsWith(term.toLowerCase())) {
          const startPos = term.length;
          const endPos = displayValue.length;
          inputRef.current.setSelectionRange(startPos, endPos);
          setSelectedIndex(exactMatchIndex);
          if (!isTouchDevice()) {
            setShowPageContent(true);
          }
        } else if (displayValue === term) {
          setShowCreatePageOption(false);
        }
      } else {        
        if (exactMatchIndex === -1 && term.trim() !== "") {
          setShowCreatePageOption(true);
          setSelectedIndex(0);
        } else {
          setShowCreatePageOption(false);
          setSelectedIndex(-1);
        }
      }
    };
  
    searchPagesAsync();
  }, [displayValue, term, pages]);

  // this is used for when the user uses the arrow keys to navigate the results list
  const handleUpdatedSelectedIndex = (newIndex: number) => {
    const indexInResults = showCreatePageOption ? newIndex - 1 : newIndex;
    if (indexInResults > -1 && indexInResults < results.length) {
      skipDisplayValueResolutionRef.current = true;
      setDisplayValue(results[indexInResults].title);
      if (!isTouchDevice()) {
        setShowPageContent(true);
      }
    }
  };
  
  const handleClickOutside = useCallback((event: { target: Node | null}) => {
    if (ulRef.current && !ulRef.current.contains(event.target)) {
      resetSelf();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside as EventListener);
    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside as EventListener
      );
    };
  }, [handleClickOutside]);

  useEffect(() => {
    if (ulRef.current && selectedIndex > -1) {
      ulRef.current?.children[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleChange = (inputElement: HTMLInputElement) => {
    const newValue = inputElement.value;
    if (newValue === "") skipTermResolutionRef.current = false;
    setTerm(newValue);
    setDisplayValue(newValue);
    storedTermRef.current = newValue;
  };

  const resetSelf = () => {
    setTerm("");
    setDisplayValue("");
    storedTermRef.current = "";
    setResults([]);
    setSelectedIndex(-1);
    setShowCreatePageOption(false);
    setShowPageContent(false);
  }

  const handleOpenExistingPage = (page: Page) => {
    setSearchTerms(page.id, storedTermRef.current);
    openOrCreatePageByTitle(page.title);
    resetSelf();
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      // if the search box is empty, show a reverse chronological list of all pages
      if (term === "" && results.length === 0) {
        showReverseChronologicalList();
      }      
      setSelectedIndex((prevIndex) => {
        const newIndex = Math.min(prevIndex + 1, showCreatePageOption ? results.length : results.length - 1);
        handleUpdatedSelectedIndex(newIndex);
        listRef.current?.scrollToItem(newIndex, "smart");
        return newIndex;
      });
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      setSelectedIndex((prevIndex) => {
        const newIndex = Math.max(prevIndex - 1, 0);
        handleUpdatedSelectedIndex(newIndex);
        listRef.current?.scrollToItem(newIndex, "smart");
        return newIndex;
      });
      event.preventDefault();
    } else if (event.key === "Enter") {
      if ((((selectedIndex === 0 && !showCreatePageOption) || selectedIndex > 0) && results.length > 0)) {
        handleOpenExistingPage(results[showCreatePageOption? selectedIndex - 1 : selectedIndex]);
        resetSelf();
      } else {
        openOrCreatePageByTitle(displayValue);
        resetSelf();
      }
      event.preventDefault();
    } else if (
      (event.key === "Backspace" && !event.metaKey) || 
      event.key === "Delete") {
      //skipTermResolutionRef.current = true;
      setSelectedIndex(-1);
    } else if (event.key === "Escape") {
      // tried also checking event.code === "Escape" to recognize
      // remapped keys but no dice, at least on iPad
      resetSelf();
    } else if (event.metaKey && event.key === "k") {
      event.preventDefault();
      // scroll to the top of the page
      window.scrollTo({ top: 0, behavior: "instant" });
      showReverseChronologicalList();
    }
  };

  const handleOnInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e.target);
  };

  const handleSearchResultsClick = (result: Page) => {
    handleOpenExistingPage(result);
    resetSelf();
  };

  const handleMouseEnter = (index: number) => {
    if (!isTouchDevice()) {
      setShowPageContent(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice()) {
      setShowPageContent(false);
    }
  };

  useClickOutside(omnibarRef, resetSelf);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const newTodayJournalTitle = getTodayJournalTitle();
      if (newTodayJournalTitle !== todayJournalTitle) {
        setTodayJournalTitle(newTodayJournalTitle);
      }
    }, 30000); // 30 seconds
  
    return () => clearInterval(intervalId);
  }, [todayJournalTitle]);

  useEffect(() => {
    if (showPageContent && results.length > 0 && selectedIndex >= 0) {
      const contentPreview = document.querySelector('.page-content-preview');
      const highlightedText = contentPreview?.querySelector('.highlight');
      if (contentPreview && highlightedText) {
        const previewRect = contentPreview.getBoundingClientRect();
        const highlightRect = highlightedText.getBoundingClientRect();

        if (highlightRect.top < previewRect.top || highlightRect.bottom > previewRect.bottom) {
          const highlightOffset = highlightRect.top - previewRect.top;
          contentPreview.scrollTop += highlightOffset - previewRect.height / 2 + highlightRect.height / 2;
        }
      }
    }
  }, [showPageContent, results, selectedIndex]);

  const ITEM_HEIGHT = 36; // Adjust based on your li height
  const LIST_HEIGHT = 300; // Match this with your max-h-[300px]

  const ResultItem = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const result = results[showCreatePageOption ? index - 1 : index];
    const isCreateOption = showCreatePageOption && index === 0;
    const isSelected = selectedIndex === index;

    return (
      <div
        style={{
          ...style,
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center', // Vertically center the content
        }}
        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
          isSelected ? "selected-item bg-gray-200 dark:bg-gray-700" : ""
        } dark:text-white`}
        onMouseEnter={() => handleMouseEnter(index)}
        onMouseLeave={handleMouseLeave}
        onClick={() => isCreateOption ? openOrCreatePageByTitle(term) : handleSearchResultsClick(result)}
        data-testid={isCreateOption ? "create-page-option" : "search-result"}
      >
        {isCreateOption ? (
          <div className="flex items-center">
            <span className="inline-flex items-center justify-center px-2 py-1 mr-2 bg-indigo-300 text-white text-xs font-bold rounded">Create page</span>
            <span>{term}</span>
          </div>
        ) : (
          <div className="flex items-center w-full">
            <div className="flex-shrink-0 whitespace-nowrap overflow-hidden text-ellipsis mr-2 flex items-center">
              {result.title === todayJournalTitle ? (
                <span className="font-medium">{result.title}</span>
              ) : (
                result.title
              )}
              {result.isJournal && (
                <span className="inline-flex items-center justify-center w-5 h-5 ml-2 bg-indigo-300 text-white text-xs font-bold rounded">
                  J
                </span>
              )}
            </div>
            <span className="text-gray-400 truncate flex-grow">{result.value}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={omnibarRef} className="relative my-4 max-w-7xl w-full">
      <input
        ref={inputRef}
        type="text"
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        value={displayValue}
        onKeyDown={handleKeyDown}
        onInput={handleOnInput}
        placeholder={isMobile ? "Search or Create" : `Search or Create (${modifierKey} + K)`}
        id="omnibar-input"
      />
      <div className="absolute top-full left-0 right-0 mt-1 z-50">
        {(results.length > 0 || showCreatePageOption) && (
          <List
            ref={listRef}
            height={LIST_HEIGHT}
            itemCount={showCreatePageOption ? results.length + 1 : results.length}
            itemSize={ITEM_HEIGHT}
            width="100%"
            className="w-full bg-white shadow-md rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            {ResultItem}
          </List>
        )}
        {showPageContent &&
          (!showCreatePageOption || (showCreatePageOption && selectedIndex > 0)) &&
          selectedIndex >= 0 &&
          (showCreatePageOption ? selectedIndex <= results.length : selectedIndex < results.length) && (
            <div className="w-full bg-white shadow-md mt-2 p-4 rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white page-content-preview" style={{ maxHeight: '800px', overflowY: 'auto' }}>
              <div 
                className="whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{
                  __html: highlightText(results[showCreatePageOption ? selectedIndex - 1 : selectedIndex].value, storedTermRef.current)
                }}
              />
            </div>
          )}
      </div>
    </div>
  );
});

Omnibar.displayName = "Omnibar";
export default Omnibar;
