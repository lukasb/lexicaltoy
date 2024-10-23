'use client';

import React, { useRef, useEffect, useContext, useCallback } from 'react';

const EditablePageTitle = ({ 
  initialTitle, 
} : {  
  initialTitle: string,
}) => {
  const titleRef = useRef<HTMLDivElement>(null); // Reference to the editable div


  return (
    <div className="flex flex-col items-start justify-center mb-[1px]">
      <div
        ref={titleRef}
        className="text-2xl font-bold px-0 py-2 focus:outline-none"
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