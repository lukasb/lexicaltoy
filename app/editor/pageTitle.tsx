'use client';

import React, { useRef, useEffect, useContext, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { updatePageTitle } from '../lib/actions';
import { PagesContext } from '@/app/context/pages-context';

const EditablePageTitle = ({ 
  pageId, 
  initialTitle, 
  updatePageTitleLocal
} : { 
  pageId: string, 
  initialTitle: string,
  updatePageTitleLocal: (id: string, newTitle: string, newRevisionNumber: number) => void;
}) => {
  const titleRef = useRef<HTMLDivElement>(null); // Reference to the editable div
  const pages = useContext(PagesContext);

  const getPage = useCallback((id: string) => {
    return pages.find((page) => page.id === id);
  }, [pages]);

  const storePageTitle = useDebouncedCallback(async (newTitle) => {
    console.log(`Updating page title`);
    const page = getPage(pageId);
    if (!page) return;
    try {
      const newRevisionNumber = await updatePageTitle(pageId, newTitle, page.revisionNumber);
      if (newRevisionNumber === -1) {
        alert("Failed to save page because you edited an old version, please relead for the latest version.");
        return;
      }
      updatePageTitleLocal(pageId, newTitle, newRevisionNumber);
    } catch (error) {
      alert("Failed to save page");
    }
  }, 500);

  // Update the page title based on div content
  const handleTitleChange = () => {
    const newTitle = titleRef.current?.innerText || initialTitle;
    storePageTitle(newTitle);
  };

  useEffect(() => {
    if (titleRef.current) {
      const page = getPage(pageId);
      if (page) {
        titleRef.current.innerText = page.title;
      }
    }
  }, [getPage, pageId]);

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