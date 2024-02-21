"use client";

import React, { 
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback
} from "react";
import { searchPages } from "../lib/pages-helpers";
import { Page } from "../lib/definitions";

const Omnibar = forwardRef(({
  pages,
  createNewPage,
  openPage
}: { 
  pages: Page[],
  createNewPage: (title: string) => void,
  openPage: (page: Page) => void
}, ref) => {

  const [term, setTerm] = useState(""); // the actual user input
  const [results, setResults] = useState<Page[]>([]);
  const [displayValue, setDisplayValue] = useState(""); // the displayed value
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const ulRef = useRef<HTMLUListElement>(null);
  const skipAutocompleteRef = useRef(false);

  // TODO accessibility
  // TODO Escape sets focus back to last active editor
  // TODO search by contents, not just title

  const showReverseChronologicalList = useCallback(() => {
    setResults(pages.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()));
  }, [pages]); // Include 'pages' as a dependency   

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    const handleFocus = () => {
      if (term === "") { 
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
    if (skipAutocompleteRef.current) {
      skipAutocompleteRef.current = false;
      return;
    }
    if (term) {
      const filteredPages = searchPages(pages, term);
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
      setDisplayValue("");
      setResults([]);
    }
  }, [term, pages]);

  useEffect(() => {
    if (displayValue !== term && displayValue.toLowerCase().startsWith(term.toLowerCase())) {
      const filteredPages = searchPages(pages, displayValue);
      const exactMatchIndex = filteredPages.findIndex(
        (page) => page.title.toLowerCase() === displayValue.toLowerCase()
      );
      if (inputRef.current && exactMatchIndex !== -1) {
        const startPos = term.length;
        const endPos = displayValue.length;
        inputRef.current.setSelectionRange(startPos, endPos);
        setSelectedIndex(exactMatchIndex);
      } else {
        setSelectedIndex(-1);
      }
    }
  }, [displayValue, term, pages]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside as EventListener);
    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (ulRef.current && selectedIndex > -1) {
      ulRef.current?.children[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTerm(newValue);
    setDisplayValue(newValue);
  };

  const resetSelf = () => {
    setTerm("");
    setDisplayValue("");
    setResults([]);
    setSelectedIndex(-1);
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      // if the search box is empty, show a reverse chronological list of all pages
      if (term === "" && results.length === 0) {
        showReverseChronologicalList();
      }      
      setSelectedIndex((prevIndex) =>
        Math.min(prevIndex + 1, results.length - 1)
      );
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      event.preventDefault();
    } else if (event.key === "Enter") {
      if (selectedIndex > -1 && results.length > 0) {
        console.log("Selected:", results[selectedIndex]);
        openPage(results[selectedIndex]);
        resetSelf();
      } else {
        console.log("Create:", term);
        createNewPage(term);
        resetSelf();
      }
      event.preventDefault();
    } else if (event.key === "Backspace" || event.key === "Delete") {
      skipAutocompleteRef.current = true;
      setSelectedIndex(-1);
      if (term.length === 1) {
        resetSelf();
      }
    } else if (event.key === "Escape") {
      resetSelf();
    }
  };

  const handleClickOutside = (event: { target: Node | null }) => {
    if (ulRef.current && !ulRef.current.contains(event.target)) {
      setDisplayValue("");
      setResults([]);
      setSelectedIndex(-1);
    }
  };

  const handleSearchResultsClick = (result: Page) => {
    openPage(result);
    resetSelf();
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
      {results.length > 0 && (
        <ul
          ref={ulRef}
          className="absolute z-10 w-full max-w-5xl bg-white shadow-md sm:max-h-60 md:max-h-[360px] lg:max-h-[600px] overflow-auto mt-1 rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          {results.map((result, index) => (
            <li
              key={index}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                selectedIndex === index ? "selected-item bg-gray-200 dark:bg-gray-700" : ""
              } dark:text-white`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => handleSearchResultsClick(result)}
              data-testid="search-result"
            >
              {result.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

Omnibar.displayName = "Omnibar";
export default Omnibar;
