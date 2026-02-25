/**
 * Entitlements Sync Hook
 *
 * Handles syncing entitlements from RevenueCat to Supabase on auth events.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { useEntitlementsStore } from '@/stores/entitlementsStore';
import {
  configureRevenueCat,
  getCustomerInfo,
  logoutRevenueCat,
  isNativePlatform,
} from '@/integrations/revenuecat/revenuecatClient';
import { REVENUECAT_CONFIG } from '@/constants/revenuecat';
import { supabase } from '@/integrations/supabase/client';

export function useEntitlementsSync() {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const store = useEntitlementsStore();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const syncEntitlements = async () => {
      if (lastUserIdRef.current === user?.id) return;
      lastUserIdRef.current = user?.id || null;

      if (isDemoMode) {
        store.setDemoMode(true);
        return;
      }

      if (!user?.id) {
        store.clear();
        await logoutRevenueCat();
        return;
      }

      if (isNativePlatform() && REVENUECAT_CONFIG.enabled) {
        try {
          const rcResult = await configureRevenueCat(user.id);
          if (rcResult.success) {
            const customerInfo = await getCustomerInfo();
            if (customerInfo.success && customerInfo.data) {
              await supabase.functions.invoke('sync-revenuecat-entitlement', {
                body: { customerInfo: customerInfo.data, user_id: user.id },
              });
            }
          }
        } catch (err) {
          console.error('[EntitlementsSync] RevenueCat sync error:', err);
        }
      }

      await store.refreshEntitlements(user.id);
    };

    syncEntitlements();
  }, [user?.id, isDemoMode]);

  return { isLoading: store.isLoading, lastSyncedAt: store.lastSyncedAt };
}
