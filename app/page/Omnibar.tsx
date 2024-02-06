'use client';

import React, { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { searchPages } from '../lib/pages-helpers';
import { Page } from '../lib/definitions';

function Omnibar({ pages } : {pages: Page[]}){
  
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Page[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSearch = useDebouncedCallback((pages, term) => {
    console.log(`Searching... ${term}`);
    const filteredPages = searchPages(pages, term);
    setResults(filteredPages);
  }, 300);

  useEffect(() => {
    if (term) {
      handleSearch(pages, term);
    } else {
      setResults([]);
    }
  }, [term]);

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
    <div>
      <input
        type="text"
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        style={{ width: '100%' }}
      />
      {results.length > 0 && (
        <ul style={{ position: 'absolute', listStyleType: 'none', padding: 0 }}>
          {results.map((result, index) => (
            <li
              key={index}
              style={{
                backgroundColor: selectedIndex === index ? '#f0f0f0' : 'transparent',
                cursor: 'pointer',
              }}
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
