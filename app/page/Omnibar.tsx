'use client';

import React, { useState, useEffect, useRef, ReactEventHandler } from 'react';
import { searchPages } from '../lib/pages-helpers';
import { Page } from '../lib/definitions';

function Omnibar({ pages } : {pages: Page[]}){

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Page[]>([]);
  const [displayValue, setDisplayValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (term) {
      const filteredPages = searchPages(pages, term);
      const exactMatch = filteredPages.find(page => page.title.toLowerCase().startsWith(term.toLowerCase()));
      if (exactMatch && inputRef.current) {
        setDisplayValue(exactMatch.title);
      } else {
        setDisplayValue(term);
      }
      setResults(filteredPages);
    } else {
      setDisplayValue('');
      setResults([]);
    }
  }, [term, pages]);

  useEffect(() => {
    if (inputRef.current && displayValue.startsWith(term)) {
      const startPos = term.length;
      const endPos = displayValue.length;
      inputRef.current.setSelectionRange(startPos, endPos);
    }
  }, [displayValue, term]);
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      setSelectedIndex((prevIndex) =>
        Math.min(prevIndex + 1, results.length - 1)
      );
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      event.preventDefault();
    } else if (event.key === "Enter" && results.length > 0) {
      if (selectedIndex > -1) {
        console.log("Selected:", results[selectedIndex]);
      }
      event.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTerm(e.target.value);
    setDisplayValue(e.target.value);
  };

  return (
    <div className="my-4">
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
        <ul className="absolute z-10 w-full max-w-5xl bg-white shadow-md max-h-60 overflow-auto mt-1 rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          {results.map((result, index) => (
            <li
              key={index}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedIndex === index ? "bg-gray-100 dark:bg-gray-700" : ""
              } dark:text-white`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => console.log("Clicked:", result)}
            >
              {result.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Omnibar;
