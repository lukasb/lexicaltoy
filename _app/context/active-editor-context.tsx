import React, { createContext, useContext, useState } from 'react';
import { ReactNode } from 'react';

// this gives the last focused editor (which might not actually be active if eg the omnibar is focused)
// currently set by the FloatingMenuPlugin

type ActiveEditorContextType = {
  activeEditorKey: string;
  setActiveEditorKey: (value: string) => void;
};

const ActiveEditorContext = createContext<ActiveEditorContextType | undefined>(undefined);

interface ActiveEditorProps {
  children: ReactNode;
}

export const ActiveEditorProvider: React.FC<ActiveEditorProps> = ({ children }) => {
  const [activeEditorKey, setActiveEditorKey] = useState<string>("");

  return (
    <ActiveEditorContext.Provider value={{ activeEditorKey, setActiveEditorKey }}>
      {children}
    </ActiveEditorContext.Provider>
  );
};

export const useActiveEditorContext = () => {
  const context = useContext(ActiveEditorContext);
  if (!context) {
    throw new Error('useActiveEditorContext must be used within an ActiveEditorProvider');
  }
  return context;
};