
import React from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { MobileTripDetail } from './MobileTripDetail';
import { TripDetailDesktop } from './TripDetailDesktop';

/**
 * TripDetail Router Wrapper
 * 
 * 🎯 Purpose: Thin wrapper that ONLY decides mobile vs desktop routing
 * 🛡️ Safety: Prevents "Rendered more hooks than during previous render" error
 *            by keeping hook count constant (only useIsMobile)
 */
const TripDetail = () => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileTripDetail />;
  }
  
  return <TripDetailDesktop />;
};

export default TripDetail;
