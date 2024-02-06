'use client';

import React, { useState, useEffect } from 'react';
import { searchPages } from '../lib/pages-helpers';
import { Page } from '../lib/definitions';

function Omnibar({ pages } : {pages: Page[]}){

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Page[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (term) {
      const filteredPages = searchPages(pages, term);
      setResults(filteredPages);
    } else {
      setResults([]);
    }
  }, [term, pages]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      setSelectedIndex((prevIndex) => Math.min(prevIndex + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    } else if (event.key === 'Enter' && results.length > 0) {
      // Handle selection
      console.log('Selected:', results[selectedIndex]);
      // Implement the action you want to take on selection
    }
  };

  return (
    <div className='max-w-5xl my-4'>
      <input
        type="text"
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search or Create"
        style={{ width: '100%' }}
      />
      {results.length > 0 && (
        <ul className="absolute z-10 w-full max-w-5xl bg-white shadow-md max-h-60 overflow-auto mt-1 rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          {results.map((result, index) => (
            <li
              key={index}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''
              } dark:text-white`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => console.log('Clicked:', result)}
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
