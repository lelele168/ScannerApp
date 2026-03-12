import React, {createContext, useContext, useState, useCallback} from 'react';
import {ScanRecord} from '../types';

interface ScanContextType {
  records: ScanRecord[];
  addRecord: (value: string, type: string) => void;
  deleteRecord: (id: string) => void;
  clearAll: () => void;
}

const ScanContext = createContext<ScanContextType | null>(null);

export const ScanProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [records, setRecords] = useState<ScanRecord[]>([]);

  const addRecord = useCallback((value: string, type: string) => {
    const newRecord: ScanRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      value,
      type,
      timestamp: Date.now(),
    };
    setRecords(prev => [newRecord, ...prev]);
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
  }, []);

  return (
    <ScanContext.Provider value={{records, addRecord, deleteRecord, clearAll}}>
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
};
