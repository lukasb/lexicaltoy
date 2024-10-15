import React, { createContext, useState, useContext, ReactNode } from 'react';
import { WikilinkWithBlockId } from '@/lib/blockref';

interface OpenWikilinkWithBlockIdContextType {
  wikilinkWithBlockIdToOpen: WikilinkWithBlockId | null;
  setWikilinkWithBlockIdToOpen: (wikilinkWithBlockId: WikilinkWithBlockId | null) => void;
}

const OpenWikilinkWithBlockIdContext = createContext<OpenWikilinkWithBlockIdContextType | undefined>(undefined);

export function OpenWikilinkWithBlockIdProvider({ children }: { children: ReactNode }) {
  const [wikilinkWithBlockIdToOpen, setWikilinkWithBlockIdToOpen] = useState<WikilinkWithBlockId | null>(null);

  return (
    <OpenWikilinkWithBlockIdContext.Provider value={{ wikilinkWithBlockIdToOpen, setWikilinkWithBlockIdToOpen }}>
      {children}
    </OpenWikilinkWithBlockIdContext.Provider>
  );
}

export function useOpenWikilinkWithBlockId() {
  const context = useContext(OpenWikilinkWithBlockIdContext);
  if (context === undefined) {
    throw new Error('useOpenWikilinkWithBlockId must be used within a OpenWikilinkWithBlockIdProvider');
  }
  return context;
}