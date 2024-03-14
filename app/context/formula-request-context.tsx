import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FormulaStringOutput } from '@/app/lib/formula/formula-definitions';

type PromisesMap = {
  [nodeKey: string]: Promise<FormulaStringOutput | null>;
};

// Define the context shape
interface PromisesContextType {
  promisesMap: PromisesMap;
  addPromise: (key: string, promise: Promise<FormulaStringOutput | null>) => void;
  removePromise: (key: string) => void;
  hasPromise: (key: string) => boolean;
}

const ongoingOperations: { [key: string]: boolean } = {};

// Initialize the context
const PromisesContext = createContext<PromisesContextType | undefined>(undefined);

// Create a provider component
interface PromisesProviderProps {
  children: ReactNode;
}

export const PromisesProvider: React.FC<PromisesProviderProps> = ({ children }) => {
  const [promisesMap, setPromisesMap] = useState<PromisesMap>({});

  const addPromise = (key: string, promise: Promise<FormulaStringOutput | null>) => {
    ongoingOperations[key] = true;
    setPromisesMap(prevMap => ({ ...prevMap, [key]: promise }));
  };

  const removePromise = (key: string) => {
    delete ongoingOperations[key];
    setPromisesMap(({ [key]: _, ...rest }) => rest);
  };

  const hasPromise = (key: string) => {
    return !!ongoingOperations[key];
  };

  return (
    <PromisesContext.Provider value={{ promisesMap, addPromise, removePromise, hasPromise }}>
      {children}
    </PromisesContext.Provider>
  );
};

// Hook for child components to use the context
export const usePromises = () => {
  const context = useContext(PromisesContext);
  if (context === undefined) {
    throw new Error('usePromises must be used within a PromisesProvider');
  }
  return context;
};
