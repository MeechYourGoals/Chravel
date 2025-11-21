import React from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { MobileProTripDetail } from './MobileProTripDetail';
import { ProTripDetailDesktop } from './ProTripDetailDesktop';

/**
 * ProTripDetail Router Wrapper
 * 
 * 🎯 Purpose: Thin wrapper that ONLY decides mobile vs desktop routing
 * 🛡️ Safety: Prevents "Rendered more hooks than during previous render" error
 *            by keeping hook count constant (only useIsMobile)
 */
const ProTripDetail = () => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileProTripDetail />;
  }
  
  return <ProTripDetailDesktop />;
};

export default ProTripDetail;
