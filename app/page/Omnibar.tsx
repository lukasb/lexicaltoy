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
import { searchPages } from "../lib/pages-helpers";
import { Page } from "../lib/definitions";
import { PagesContext } from "@/app/context/pages-context";
import { isTouchDevice } from "../lib/window-helpers";

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
  const pages = useContext(PagesContext);

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
  
  useEffect(() => {
    const searchPagesAsync = async () => {
      if (skipTermResolutionRef.current === true) {
        skipTermResolutionRef.current = false;
        return;
      }
  
      if (term) {
        const filteredPages = await searchPages(pages, term);
        const startMatch = filteredPages.find((page) =>
          page.title.toLowerCase().startsWith(term.toLowerCase())
        );
  
        if (startMatch && inputRef.current) {
          setDisplayValue(startMatch.title);
        } else {
          setDisplayValue(term);
          setSelectedIndex(-1);
        }
  
        setResults(filteredPages);
        setShowCreatePageOption(filteredPages.length === 0 && term.trim() !== "");
      } else {
        resetSelf();
      }
    };
  
    searchPagesAsync();
  }, [term, pages]);

  useEffect(() => {
    const searchPagesAsync = async () => {
      if (displayValue !== term && displayValue.toLowerCase().startsWith(term.toLowerCase())) {
        const filteredPages = await searchPages(pages, displayValue);
        const exactMatchIndex = filteredPages.findIndex(
          (page) => page.title.toLowerCase() === displayValue.toLowerCase()
        );
  
        if (inputRef.current && exactMatchIndex !== -1) {
          const startPos = term.length;
          const endPos = displayValue.length;
          inputRef.current.setSelectionRange(startPos, endPos);
          setSelectedIndex(exactMatchIndex);
          if (!isTouchDevice()) {
            setShowPageContent(true);
          }
        } else {
          setSelectedIndex(-1);
        }
      }
    };
  
    searchPagesAsync();
  }, [displayValue, term, pages]);
  
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
  };

  const resetSelf = () => {
    setTerm("");
    setDisplayValue("");
    setResults([]);
    setSelectedIndex(-1);
    setShowCreatePageOption(false);
    setShowPageContent(false);
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      // if the search box is empty, show a reverse chronological list of all pages
      if (term === "" && results.length === 0) {
        showReverseChronologicalList();
      }      
      /*setSelectedIndex((prevIndex) => {
        const newIndex = Math.max(Math.min(prevIndex + 1, results.length - 1), 0);
        if (newIndex < results.length) {
          setDisplayValue(results[newIndex].title);
        }
        return newIndex;
      });*/
      setSelectedIndex((prevIndex) =>
        Math.min(prevIndex + 1, results.length - 1)
      );
      if (!isTouchDevice()) {
        setShowPageContent(true);
      }
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      /*setSelectedIndex((prevIndex) => {
        const newIndex = Math.max(prevIndex - 1, 0);
        setDisplayValue(results[newIndex].title);
        return newIndex;
      });*/
      setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      if (!isTouchDevice()) {
        setShowPageContent(true);
      }
      event.preventDefault();
    } else if (event.key === "Enter") {
      if (selectedIndex > -1 && results.length > 0) {
        openOrCreatePageByTitle(results[selectedIndex].title);
        resetSelf();
      } else {
        openOrCreatePageByTitle(displayValue);
        resetSelf();
      }
      event.preventDefault();
    } else if (event.key === "Backspace" || event.key === "Delete") {
      skipTermResolutionRef.current = true;
      setSelectedIndex(-1);
    } else if (event.key === "Escape") {
      resetSelf();
    } else if (event.metaKey && event.key === "k") {
      event.preventDefault();
      showReverseChronologicalList();
    }
  };

  const handleSearchResultsClick = (result: Page) => {
    openOrCreatePageByTitle(result.title);
    resetSelf();
  };

  const handleMouseEnter = (index: number) => {
    setSelectedIndex(index);
    if (!isTouchDevice()) {
      setShowPageContent(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice()) {
      setShowPageContent(false);
    }
  };

  return (
    <div className="relative my-4 max-w-7xl">
      <input
        ref={inputRef}
        type="text"
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search or Create"
      />
      <div className="absolute top-full left-0 right-0 mt-1 z-50">
        {(results.length > 0 || showCreatePageOption) && (
          <ul
            ref={ulRef}
            className="w-full max-w-5xl bg-white shadow-md max-h-[400px] md:max-h-[500px] lg:max-h-[600px] overflow-auto rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            {results.map((result, index) => (
              <li
                key={index}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  selectedIndex === index
                    ? "selected-item bg-gray-200 dark:bg-gray-700"
                    : ""
                } dark:text-white`}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleSearchResultsClick(result)}
                data-testid="search-result"
              >
                {result.title}
                {result.isJournal && (
                  <span className="text-gray-400 ml-2">journal</span>
                )}
              </li>
            ))}
            {showCreatePageOption && (
              <li
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  selectedIndex === results.length
                    ? "selected-item bg-gray-200 dark:bg-gray-700"
                    : ""
                } dark:text-white`}
                onMouseEnter={() => setSelectedIndex(results.length)}
                onClick={() => openOrCreatePageByTitle(term)}
                data-testid="create-page-option"
              >
                Create page <i>{term}</i>
              </li>
            )}
          </ul>
        )}
        {showPageContent && !showCreatePageOption && selectedIndex >= 0 && selectedIndex < results.length && (
          <div className="w-full max-w-5xl bg-white shadow-md mt-2 p-4 rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
            <div className="whitespace-pre-wrap break-words">
              {results[selectedIndex].value}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Omnibar.displayName = "Omnibar";
export default Omnibar;
