'use client';

import React, { useRef, useEffect, useContext, useCallback } from 'react';
import { updatePageTitle } from '@/lib/db';
import { PagesContext } from '@/_app/context/pages-context';

const EditablePageTitle = ({ 
  pageId, 
  initialTitle, 
  isJournal,
  updatePageTitleLocal,
  isEditing,
  setIsEditing
} : { 
  pageId: string, 
  initialTitle: string,
  isJournal: boolean,
  updatePageTitleLocal: (id: string, newTitle: string, newRevisionNumber: number, newLastModified: Date) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) => {
  const titleRef = useRef<HTMLDivElement>(null); // Reference to the editable div
  const pages = useContext(PagesContext);

  const getPage = useCallback((id: string) => {
    return pages.find((page) => page.id === id);
  }, [pages]);

  // TODO this assumes that the page won't be renamed elsewhere in the same PagesContext
  const storePageTitle = async (newTitle: string) => {
    const page = getPage(pageId);
    if (!page) return;
    try {
      const { revisionNumber, lastModified, error } = await updatePageTitle(pageId, newTitle, page.revisionNumber);
      if (!revisionNumber || !lastModified) {
        alert("Failed to update title because you edited an old version, please relead for the latest version.");
        return;
      }
      updatePageTitleLocal(pageId, newTitle, revisionNumber, lastModified);
    } catch (error) {
      alert("Failed to update title");
    }
  };

  // Update the page title based on div content
  const handleTitleChange = () => {
    const newTitle = titleRef.current?.innerText || initialTitle;
    storePageTitle(newTitle);
    setIsEditing(false);
  };

  useEffect(() => {
    if (titleRef.current) {
      const page = getPage(pageId);
      if (page) {
        titleRef.current.innerText = page.title;
        if (isEditing) {
          titleRef.current.focus();
          // Place cursor at the end of the text
          const range = document.createRange();
          range.selectNodeContents(titleRef.current);
          range.collapse(false);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    }
  }, [getPage, pageId, isEditing]);

  return (
    <div className="flex flex-col items-start justify-center">
      <div
        ref={titleRef}
        className="text-2xl font-bold px-0 py-2 focus:outline-none"
        contentEditable={!isJournal && isEditing}
        suppressContentEditableWarning={true}
        onBlur={isJournal? undefined : handleTitleChange} // Update state when user leaves the editable area
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