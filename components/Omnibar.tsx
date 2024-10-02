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
import { searchPages } from "@/lib/pages-helpers";
import { Page } from "@/lib/definitions";
import { PagesContext } from "@/_app/context/pages-context";
import { isTouchDevice } from "@/lib/window-helpers";
import { getTodayJournalTitle } from "@/lib/journal-helpers";
import { getModifierKey } from "@/lib/utils";
import { useBreakpoint } from "@/lib/window-helpers";
import { highlightText } from "@/lib/text-helpers";
import { useSearchTerms } from "@/_app/context/search-terms-context";

const Omnibar = forwardRef(({
  openOrCreatePageByTitle
}: { 
  openOrCreatePageByTitle: (title: string) => void;
}, ref) => {

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

  useEffect(() => {
    setModifierKey(getModifierKey());
  }, []);

  useBreakpoint(768, isMobile, setIsMobile);

  // TODO accessibility
  // TODO Escape sets focus back to last active editor

  const showReverseChronologicalList = useCallback(() => {
    setResults(pages.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()));
  }, [pages]);

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
        const filteredPages = await searchPages(pages, term);
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
  }, [term, pages]);

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
 
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
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
        return newIndex;
      });
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      setSelectedIndex((prevIndex) => {
        const newIndex = Math.max(prevIndex - 1, 0);
        handleUpdatedSelectedIndex(newIndex);
        return newIndex;
      });
      event.preventDefault();
    } else if (event.key === "Enter") {
      if (selectedIndex > -1 && results.length > 0) {
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
      skipTermResolutionRef.current = true;
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

  return (
    <div className="relative my-4 max-w-7xl w-full">
      <input
        ref={inputRef}
        type="text"
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={isMobile ? "Search or Create" : `Search or Create (${modifierKey} + K)`}
        id="omnibar-input"
      />
      <div className="absolute top-full left-0 right-0 mt-1 z-50">
        {(results.length > 0 || showCreatePageOption) && (
          <ul
            ref={ulRef}
            className="w-full bg-white shadow-md max-h-[300px] md:max-h-[300px] lg:max-h-[300px] overflow-auto rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            {showCreatePageOption && (
              <li
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  selectedIndex === 0
                    ? "selected-item bg-gray-200 dark:bg-gray-700"
                    : ""
                } dark:text-white`}
                onClick={() => openOrCreatePageByTitle(term)}
                data-testid="create-page-option"
              >
                <span className="inline-flex items-center justify-center p-1 bg-indigo-300 text-white font-bold rounded">Create page</span> {term}
              </li>
            )}
            {results.map((result, index) => (
              <li
                key={result.id}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  selectedIndex === (showCreatePageOption ? index + 1 : index)
                    ? "selected-item bg-gray-200 dark:bg-gray-700"
                    : ""
                } dark:text-white`}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleSearchResultsClick(result)}
                data-testid="search-result"
              >
                <div className="flex items-center">
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
              </li>
            ))}
          </ul>
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