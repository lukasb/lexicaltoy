import React, { createContext, useState, useContext, ReactNode } from 'react';

interface WikilinkWithBlockId {
  pageName: string;
  blockId: string;
}

interface WikilinkWithBlockIdContextType {
  wikilinkWithBlockId: WikilinkWithBlockId | null;
  setWikilinkWithBlockId: (wikilinkWithBlockId: WikilinkWithBlockId | null) => void;
}

const WikilinkWithBlockIdContext = createContext<WikilinkWithBlockIdContextType | undefined>(undefined);

export function WikilinkWithBlockIdProvider({ children }: { children: ReactNode }) {
  const [wikilinkWithBlockId, setWikilinkWithBlockId] = useState<WikilinkWithBlockId | null>(null);

  return (
    <WikilinkWithBlockIdContext.Provider value={{ wikilinkWithBlockId, setWikilinkWithBlockId }}>
      {children}
    </WikilinkWithBlockIdContext.Provider>
  );
}

export function useWikilinkWithBlockId() {
  const context = useContext(WikilinkWithBlockIdContext);
  if (context === undefined) {
    throw new Error('useWikilinkWithBlockId must be used within a WikilinkWithBlockIdProvider');
  }
  return context;
}