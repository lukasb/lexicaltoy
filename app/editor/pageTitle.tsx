'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { updatePageTitle } from '../lib/actions';

const EditablePageTitle = ({ 
  pageId, 
  initialTitle, 
  updatePageTitleLocal
} : { 
  pageId: string, 
  initialTitle: string,
  updatePageTitleLocal: (id: string, newTitle: string) => void;
}) => {
  const [pageTitle, setPageTitle] = useState(initialTitle);
  const titleRef = useRef<HTMLDivElement>(null); // Reference to the editable div

  const storePageTitle = useDebouncedCallback((newTitle) => {
    console.log(`Updating page title`);
    updatePageTitle(pageId, newTitle);
    updatePageTitleLocal(pageId, newTitle);
  }, 500);

  // Update the page title based on div content
  const handleTitleChange = () => {
    const newTitle = titleRef.current?.innerText || initialTitle;
    setPageTitle(newTitle);
    storePageTitle(newTitle);
  };

  // This effect ensures that the contentEditable div is updated if the initialTitle prop changes
  // after the component has mounted.
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.innerText = initialTitle;
    }
  }, [initialTitle]);

  return (
    <div className="flex flex-col items-start justify-center">
      <div
        ref={titleRef}
        className="text-2xl font-bold mb-4 px-0 py-2 focus:outline-none"
        contentEditable
        suppressContentEditableWarning={true}
        onBlur={handleTitleChange} // Update state when user leaves the editable area
        role="textbox" // ARIA role for better accessibility
        aria-multiline="false"
        data-testid="editable-title"
      >
        {initialTitle}
      </div>
    </div>
  );
};

export default EditablePageTitle;