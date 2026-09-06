'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Branch } from '@/types/database';
import { supabase } from '@/lib/supabaseClient';
import { 
  getBranches as getLocalBranches, 
  saveBranch as saveLocalBranch, 
  toggleBranchActive as toggleLocalBranchActive, 
  deleteBranch as deleteLocalBranch,
  saveCmsSettings
} from '@/lib/store';

export interface BranchContextType {
  branches: Branch[];
  activeBranches: Branch[];
  isLoading: boolean;
  refreshBranches: () => Promise<Branch[]>;
  createBranch: (branchData: Partial<Branch> & { name: string }) => Promise<Branch | null>;
  updateBranch: (id: string, branchData: Partial<Branch>) => Promise<boolean>;
  deleteBranch: (id: string) => Promise<boolean>;
  toggleBranchActive: (id: string, is_active: boolean) => Promise<boolean>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync branches to storefront_settings on Supabase to ensure storefront CMS stays up to date
  const syncStorefrontSettings = useCallback(async (branchList: Branch[]) => {
    try {
      const cmsBranches = branchList.map(b => ({
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        hours: b.hours || '08:00 - 22:00',
        maps_url: b.maps_url || `https://maps.google.com/?q=${encodeURIComponent(b.address || b.name)}`,
        is_active: b.is_active !== false && b.status !== 'PAUSED',
        district: b.district,
        city: b.city,
        latitude: b.latitude,
        longitude: b.longitude
      }));

      saveCmsSettings({ branches: cmsBranches });

      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('id', 'default_config')
        .maybeSingle();

      const existingConfig = data?.data || {};
      const updatedConfig = {
        ...existingConfig,
        branches: cmsBranches
      };

      await supabase.from('storefront_settings').upsert({
        id: 'default_config',
        data: updatedConfig,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Lỗi đồng bộ storefront_settings branches:', e);
    }
  }, []);

  const fetchBranches = useCallback(async (): Promise<Branch[]> => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        setBranches(data as Branch[]);
        setIsLoading(false);
        return data as Branch[];
      }
    } catch (err) {
      console.warn('Supabase branches fetch warning, loading from local store fallback:', err);
    }

    // Fallback to local store
    const localBranches = getLocalBranches();
    setBranches(localBranches);
    setIsLoading(false);
    return localBranches;
  }, []);

  useEffect(() => {
    fetchBranches();

    // Setup Supabase Realtime Subscription for table 'branches'
    const channel = supabase
      .channel('realtime-branches-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branches' },
        (payload) => {
          console.log('⚡ Realtime branch update received from Supabase:', payload);
          fetchBranches();
        }
      )
      .subscribe();

    const handleStoreUpdate = () => {
      const localList = getLocalBranches();
      if (localList && localList.length > 0) {
        setBranches(localList);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('gum_store_update', handleStoreUpdate);
    }

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('gum_store_update', handleStoreUpdate);
      }
    };
  }, [fetchBranches]);

  const activeBranches = useMemo(() => {
    return branches.filter((b) => b.is_active !== false && b.status !== 'PAUSED');
  }, [branches]);

  const createBranch = useCallback(async (branchData: Partial<Branch> & { name: string }): Promise<Branch | null> => {
    try {
      const newId = branchData.id || `b-${Date.now()}`;
      const payload: Branch = {
        id: newId,
        name: branchData.name,
        address: branchData.address || '',
        district: branchData.district || '',
        city: branchData.city || 'Hà Nội',
        phone: branchData.phone || '',
        manager: branchData.manager || 'Quản lý cơ sở',
        status: branchData.status || 'ACTIVE',
        hours: branchData.hours || '08:00 - 22:00',
        display_order: branchData.display_order || (branches.length + 1),
        maps_url: branchData.maps_url || `https://maps.google.com/?q=${encodeURIComponent(branchData.address || branchData.name)}`,
        is_active: branchData.is_active !== undefined ? branchData.is_active : true,
        bank_name: branchData.bank_name || 'MB Bank',
        bank_account: branchData.bank_account || '0988123456',
        bank_holder: branchData.bank_holder || branchData.name.toUpperCase(),
        capacity_per_hour: branchData.capacity_per_hour || 35,
        main_stock: branchData.main_stock || 50,
        latitude: branchData.latitude !== undefined ? Number(branchData.latitude) : undefined,
        longitude: branchData.longitude !== undefined ? Number(branchData.longitude) : undefined
      };

      // 1. Write to Supabase DB
      const { data, error } = await supabase
        .from('branches')
        .upsert([payload])
        .select()
        .single();

      if (error) {
        console.warn('Lỗi upsert Supabase branch, saving to local store:', error);
      }

      // 2. Write to Local Store
      const updatedLocal = saveLocalBranch(payload);

      // 3. Sync storefront settings & refresh
      await syncStorefrontSettings(updatedLocal);
      await fetchBranches();

      return (data as Branch) || payload;
    } catch (e) {
      console.error('Error creating branch:', e);
      return null;
    }
  }, [branches.length, fetchBranches, syncStorefrontSettings]);

  const updateBranch = useCallback(async (id: string, branchData: Partial<Branch>): Promise<boolean> => {
    try {
      const existing = branches.find(b => b.id === id);
      const payload = {
        ...existing,
        ...branchData,
        id,
        updated_at: new Date().toISOString()
      };

      // 1. Write to Supabase DB
      const { error } = await supabase
        .from('branches')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.warn('Lỗi update Supabase branch, falling back to local store:', error);
      }

      // 2. Write to Local Store
      const updatedLocal = saveLocalBranch({ ...payload, name: payload.name || 'Chi Nhánh' });

      // 3. Sync storefront settings & refresh
      await syncStorefrontSettings(updatedLocal);
      await fetchBranches();

      return true;
    } catch (e) {
      console.error('Error updating branch:', e);
      return false;
    }
  }, [branches, fetchBranches, syncStorefrontSettings]);

  const deleteBranch = useCallback(async (id: string): Promise<boolean> => {
    try {
      // 1. Delete from Supabase DB
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Lỗi delete Supabase branch:', error);
      }

      // 2. Delete from Local Store
      const updatedLocal = deleteLocalBranch(id);

      // 3. Sync & refresh
      await syncStorefrontSettings(updatedLocal);
      await fetchBranches();

      return true;
    } catch (e) {
      console.error('Error deleting branch:', e);
      return false;
    }
  }, [fetchBranches, syncStorefrontSettings]);

  const toggleBranchActive = useCallback(async (id: string, is_active: boolean): Promise<boolean> => {
    try {
      const status = is_active ? 'ACTIVE' : 'PAUSED';

      // 1. Update Supabase DB
      const { error } = await supabase
        .from('branches')
        .update({ is_active, status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.warn('Lỗi toggle active Supabase branch:', error);
      }

      // 2. Update Local Store
      const updatedLocal = toggleLocalBranchActive(id, is_active);

      // 3. Sync & refresh
      await syncStorefrontSettings(updatedLocal);
      await fetchBranches();

      return true;
    } catch (e) {
      console.error('Error toggling branch active:', e);
      return false;
    }
  }, [fetchBranches, syncStorefrontSettings]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranches,
        isLoading,
        refreshBranches: fetchBranches,
        createBranch,
        updateBranch,
        deleteBranch,
        toggleBranchActive
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranches(): BranchContextType {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranches must be used within a BranchProvider');
  }
  return context;
}
