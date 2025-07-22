import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadDocumentsContextType {
  refreshTrigger: number;
  notifyDocumentChange: () => void;
}

const LoadDocumentsContext = createContext<LoadDocumentsContextType | undefined>(undefined);

export function LoadDocumentsProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const notifyDocumentChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <LoadDocumentsContext.Provider value={{ refreshTrigger, notifyDocumentChange }}>
      {children}
    </LoadDocumentsContext.Provider>
  );
}

export function useLoadDocuments() {
  const context = useContext(LoadDocumentsContext);
  if (context === undefined) {
    throw new Error('useLoadDocuments must be used within a LoadDocumentsProvider');
  }
  return context;
}