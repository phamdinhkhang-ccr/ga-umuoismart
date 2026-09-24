import { useEffect, useState, useCallback } from 'react';

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  city?: string;
  district?: string;
  address: string;
  phone?: string;
  hotline: string;
  hours?: string;
  openingHours?: string;
  managerName?: string;
  googleMapsUrl?: string;
  image?: string;
  keywords?: string[];
  isActive: boolean;
  sortOrder?: number;
}

let globalBranchesCache: BranchRecord[] | null = null;
const listeners = new Set<() => void>();

export function invalidateBranchesCache() {
  globalBranchesCache = null;
  listeners.forEach((l) => l());
}

export function useBranches(onlyActive: boolean = true) {
  const [branches, setBranches] = useState<BranchRecord[]>(globalBranchesCache || []);
  const [loading, setLoading] = useState(!globalBranchesCache);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/branches?${onlyActive ? 'status=active&' : ''}_t=${Date.now()}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) {
        globalBranchesCache = data.branches;
        setBranches(
          onlyActive
            ? data.branches.filter((b: BranchRecord) => b.isActive)
            : data.branches
        );
        listeners.forEach((l) => l());
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => {
    const updateHandler = () => {
      if (globalBranchesCache) {
        setBranches(
          onlyActive
            ? globalBranchesCache.filter((b) => b.isActive)
            : globalBranchesCache
        );
      }
    };

    listeners.add(updateHandler);

    if (!globalBranchesCache) {
      fetchBranches();
    } else {
      updateHandler();
    }

    return () => {
      listeners.delete(updateHandler);
    };
  }, [onlyActive, fetchBranches]);

  const refreshBranches = () => {
    globalBranchesCache = null;
    return fetchBranches();
  };

  return { branches, loading, refreshBranches };
}

/**
 * Dynamic AI Branch Matcher based on actual DB branches
 */
export function detectBranchIdFromText(text: string, branchesList: BranchRecord[]): string {
  if (!text || !branchesList || branchesList.length === 0) return branchesList?.[0]?.id || 'cs1';
  const lower = text.toLowerCase();

  // Try matching branch name, code, or address keywords dynamically
  for (const branch of branchesList) {
    const bName = (branch.name || '').toLowerCase();
    const bCode = (branch.code || '').toLowerCase();
    const bAddress = (branch.address || '').toLowerCase();

    // Match code (e.g. cs1, cs2, cs6)
    if (bCode && lower.includes(bCode)) {
      return branch.id;
    }

    // Match name (e.g. "vin smart", "cầu giấy", "đống đa", "tây hồ", "thanh xuân", etc.)
    const nameClean = bName.replace(/^(cs\d+|cơ sở\s*\d*)\s*[-–:]\s*/i, '').trim();
    if (nameClean && (lower.includes(nameClean) || nameClean.includes(lower))) {
      return branch.id;
    }

    // Match address components
    const addressParts = bAddress.split(/[,.-]/).map((w) => w.trim().toLowerCase());
    for (const part of addressParts) {
      if (part.length > 3 && lower.includes(part)) {
        return branch.id;
      }
    }
  }

  // Fallback to first active branch
  return branchesList[0]?.id || 'cs1';
}
