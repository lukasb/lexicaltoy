import React, { createContext, useState, useContext, ReactNode } from 'react';
import { RangeSelection } from 'lexical';

interface SavedSelectionContextType {
  savedSelection: RangeSelection | null;
  setSavedSelection: (selection: RangeSelection | null) => void;
}

const SavedSelectionContext = createContext<SavedSelectionContextType | undefined>(undefined);

export function SavedSelectionProvider({ children }: { children: ReactNode }) {
  const [savedSelection, setSavedSelection] = useState<RangeSelection | null>(null);

  return (
    <SavedSelectionContext.Provider value={{ savedSelection, setSavedSelection }}>
      {children}
    </SavedSelectionContext.Provider>
  );
}

export function useSavedSelection() {
  const context = useContext(SavedSelectionContext);
  if (context === undefined) {
    throw new Error('useSavedSelection must be used within a SavedSelectionProvider');
  }
  return context;
}