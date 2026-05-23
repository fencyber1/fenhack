import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ScanResult, Alert } from '../types';

interface ScanContextType {
  scans: ScanResult[];
  alerts: Alert[];
  addScan: (scan: ScanResult) => void;
  updateScan: (id: string, updates: Partial<ScanResult>) => void;
  addAlert: (alert: Alert) => void;
  clearAlerts: () => void;
  currentScan: ScanResult | null;
  setCurrentScan: (scan: ScanResult | null) => void;
}

const ScanContext = createContext<ScanContextType | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [scans, setScans] = useState<ScanResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fenhack_scans') || '[]');
    } catch { return []; }
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);

  const addScan = (scan: ScanResult) => {
    setScans(prev => {
      const updated = [scan, ...prev];
      localStorage.setItem('fenhack_scans', JSON.stringify(updated));
      return updated;
    });
  };

  const updateScan = (id: string, updates: Partial<ScanResult>) => {
    setScans(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      localStorage.setItem('fenhack_scans', JSON.stringify(updated));
      return updated;
    });
    setCurrentScan(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  const addAlert = (alert: Alert) => {
    setAlerts(prev => [alert, ...prev].slice(0, 50));
  };

  const clearAlerts = () => setAlerts([]);

  return (
    <ScanContext.Provider value={{ scans, alerts, addScan, updateScan, addAlert, clearAlerts, currentScan, setCurrentScan }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
