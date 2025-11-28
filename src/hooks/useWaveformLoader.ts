import { useState, useEffect, useCallback, useRef } from 'react';

// Type for a single waveform (array of samples)
type Waveform = number[];

// Type for a bank (object mapping waveform names to waveform data)
export type BankData = Record<string, Waveform>;

// Manifest structure
interface Manifest {
  banks: string[];
}

interface UseWaveformLoaderReturn {
  /** List of available bank names */
  banks: string[];
  /** Currently loaded bank data, or null if none loaded */
  currentBank: BankData | null;
  /** Name of the currently loaded bank */
  currentBankName: string | null;
  /** Whether a bank is currently being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Load a bank by name */
  loadBank: (bankName: string) => Promise<void>;
}

const WAVEFORMS_PATH = '/waveforms';

export function useWaveformLoader(): UseWaveformLoaderReturn {
  const [banks, setBanks] = useState<string[]>([]);
  const [currentBank, setCurrentBank] = useState<BankData | null>(null);
  const [currentBankName, setCurrentBankName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for loaded banks
  const bankCache = useRef<Map<string, BankData>>(new Map());

  // Load manifest on mount
  useEffect(() => {
    async function loadManifest() {
      try {
        const response = await fetch(`${WAVEFORMS_PATH}/manifest.json`);
        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.status}`);
        }
        const manifest: Manifest = await response.json();
        setBanks(manifest.banks);

        // Load the first bank automatically
        if (manifest.banks.length > 0) {
          await loadBankInternal(manifest.banks[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load waveform manifest');
        setIsLoading(false);
      }
    }

    loadManifest();
  }, []);

  // Internal load function (doesn't update loading state for initial load)
  const loadBankInternal = async (bankName: string) => {
    // Check cache first
    const cached = bankCache.current.get(bankName);
    if (cached) {
      setCurrentBank(cached);
      setCurrentBankName(bankName);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${WAVEFORMS_PATH}/${bankName}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load bank ${bankName}: ${response.status}`);
      }
      const bankData: BankData = await response.json();

      // Cache the loaded bank
      bankCache.current.set(bankName, bankData);

      setCurrentBank(bankData);
      setCurrentBankName(bankName);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load bank ${bankName}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Public load function
  const loadBank = useCallback(async (bankName: string) => {
    // If already loaded, just switch to cached version
    const cached = bankCache.current.get(bankName);
    if (cached) {
      setCurrentBank(cached);
      setCurrentBankName(bankName);
      return;
    }

    setIsLoading(true);
    setError(null);
    await loadBankInternal(bankName);
  }, []);

  return {
    banks,
    currentBank,
    currentBankName,
    isLoading,
    error,
    loadBank,
  };
}

export default useWaveformLoader;
