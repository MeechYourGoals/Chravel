import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Info } from 'lucide-react';
import { MobileTripTabs } from '../components/mobile/MobileTripTabs';
import { MobileErrorBoundary } from '../components/mobile/MobileErrorBoundary';
import { MobileTripInfoDrawer } from '../components/mobile/MobileTripInfoDrawer';
import { MobileHeaderOptionsSheet } from '../components/mobile/MobileHeaderOptionsSheet';
import { TripExportModal } from '../components/trip/TripExportModal';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { hapticService } from '../services/hapticService';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTrips } from '../hooks/useTrips';
import { useTripMembers } from '../hooks/useTripMembers';
import { convertSupabaseTripsToMock, convertSupabaseTripToProTrip } from '../utils/tripConverter';
import { MockRolesService } from '../services/mockRolesService';
import { tripService } from '../services/tripService';
import { ProTripData, ProParticipant } from '../types/pro';
import { ExportSection } from '../types/tripExport';
import { openOrDownloadBlob } from '../utils/download';
import { demoModeService } from '../services/demoModeService';
import { toast } from 'sonner';

export const MobileProTripDetail = () => {
  const { proTripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();

  // ✅ FIXED: Always call useTrips hook (Rules of Hooks requirement)
  const { trips: userTrips, loading: tripsLoading } = useTrips();

  // 🔄 CRITICAL FIX: Fetch real trip members from database for authenticated trips
  const { tripMembers, loading: membersLoading } = useTripMembers(proTripId);

  // Persist activeTab in sessionStorage to survive orientation changes
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'chat';
    const storedTab = sessionStorage.getItem(`protrip_${proTripId}_activeTab`);
    return storedTab || 'chat';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [tripDescription, setTripDescription] = useState<string>('');
  const [showTripInfo, setShowTripInfo] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);

  const headerRef = React.useRef<HTMLDivElement>(null);

  // Persist activeTab changes to sessionStorage
  React.useEffect(() => {
    if (proTripId) {
      sessionStorage.setItem(`protrip_${proTripId}_activeTab`, activeTab);
    }
  }, [activeTab, proTripId]);
 
  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

  // Calculate tripData with useMemo - MUST be before any conditional returns
  // 🔄 MOBILE FIX: Use tripMembers from hook instead of manual fetching
  const tripData = useMemo(() => {
    if (!proTripId) return null;

    if (isDemoMode) {
      return proTripId in proTripMockData ? proTripMockData[proTripId] : null;
    }

    // Find Pro trip from Supabase data
    const supabaseTrip = userTrips.find(t => String(t.id) === proTripId && t.trip_type === 'pro');

    if (!supabaseTrip) return null;

    // Convert to ProTripData format
    const convertedTrip = convertSupabaseTripToProTrip(supabaseTrip);

    // Populate with real trip members from hook
    const proParticipants: ProParticipant[] = tripMembers.map(m => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      role: 'member',
      email: '',
      credentialLevel: 'Guest',
      permissions: []
    } as ProParticipant));

    return {
      ...convertedTrip,
      participants: proParticipants,
      roster: proParticipants,
      proTripCategory: 'Sports – Pro, Collegiate, Youth',
      enabled_features: supabaseTrip.enabled_features || ['chat', 'calendar', 'concierge', 'media', 'payments', 'places', 'polls', 'tasks'],
    } as ProTripData;
  }, [isDemoMode, proTripId, userTrips, tripMembers]);

  // Initialize mock roles and channels ONLY in demo mode
  React.useEffect(() => {
    if (isDemoMode && proTripId && proTripId in proTripMockData) {
      const mockTripData = proTripMockData[proTripId];
      const existingRoles = MockRolesService.getRolesForTrip(proTripId);

      if (!existingRoles) {
        const roles = MockRolesService.seedRolesForTrip(
          proTripId,
          mockTripData.proTripCategory,
          user?.id || 'demo-user'
        );
        MockRolesService.seedChannelsForRoles(proTripId, roles, user?.id || 'demo-user');
      }
    }
  }, [isDemoMode, proTripId, user?.id]);

  // Set trip description when tripData loads
  React.useEffect(() => {
    if (tripData && !tripDescription) {
      setTripDescription(tripData.description || '');
    }
  }, [tripData, tripDescription]);
  
  // Measure header height and expose as CSS var for sticky offsets
  React.useEffect(() => {
    const setHeaderHeightVar = () => {
      const h = headerRef.current?.offsetHeight || 73;
      document.documentElement.style.setProperty('--mobile-header-h', `${h}px`);
    };
    const debounce = (fn: () => void, delay = 100) => {
      let t: ReturnType<typeof setTimeout>;
      return () => {
        clearTimeout(t);
        t = setTimeout(fn, delay);
      };
    };
    const handler = debounce(setHeaderHeightVar, 100);
    setHeaderHeightVar();
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  // PDF Export handler
  const handleExport = useCallback(async (sections: ExportSection[]) => {
    const tripIdStr = proTripId || '1';
    const isNumericId = !tripIdStr.includes('-');
    
    toast.info('Generating PDF', {
      description: `Creating summary for "${tripData?.title || 'Pro Trip'}"...`,
    });

    try {
      let blob: Blob;

      if (isDemoMode || isNumericId) {
        const mockPayments = demoModeService.getMockPayments(tripIdStr);
        const mockPolls = demoModeService.getMockPolls(tripIdStr);
        const mockTasks = demoModeService.getMockTasks(tripIdStr);
        const mockPlaces = demoModeService.getMockPlaces(tripIdStr);
        
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        blob = await generateClientPDF(
          {
            tripId: tripIdStr,
            tripTitle: tripData?.title || 'Pro Trip',
            destination: tripData?.location,
            dateRange: tripData?.dateRange,
            calendar: sections.includes('calendar') ? [] : undefined,
            payments: sections.includes('payments') && mockPayments.length > 0 ? {
              items: mockPayments,
              total: mockPayments.reduce((sum, p) => sum + p.amount, 0),
              currency: mockPayments[0]?.currency || 'USD'
            } : undefined,
            polls: sections.includes('polls') ? mockPolls : undefined,
            tasks: sections.includes('tasks') ? mockTasks.map(task => ({
              title: task.title,
              description: task.description,
              completed: task.completed
            })) : undefined,
            places: sections.includes('places') ? mockPlaces : undefined,
          },
          sections,
          { customization: { compress: true, maxItemsPerSection: 100 } }
        );
      } else {
        const { getExportData } = await import('../services/tripExportDataService');
        const realData = await getExportData(tripIdStr, sections);
        
        if (!realData) {
          throw new Error('Could not fetch trip data for export');
        }
        
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        blob = await generateClientPDF(
          {
            tripId: tripIdStr,
            tripTitle: realData.trip.title,
            destination: realData.trip.destination,
            dateRange: realData.trip.dateRange,
            description: realData.trip.description,
            calendar: realData.calendar,
            payments: realData.payments,
            polls: realData.polls,
            tasks: realData.tasks,
            places: realData.places,
            roster: realData.roster,
          },
          sections,
          { customization: { compress: true, maxItemsPerSection: 100 } }
        );
      }

      const sanitizedTitle = (tripData?.title || 'Pro Trip').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `ProTrip_${sanitizedTitle}_${Date.now()}.pdf`;

      await openOrDownloadBlob(blob, filename, { mimeType: 'application/pdf' });

      toast.success('Export complete', {
        description: `PDF ready: ${filename}`,
      });
    } catch (error) {
      console.error('[MobileProTripDetail Export] Error:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
      });
      throw error;
    }
  }, [proTripId, tripData, isDemoMode]);

  // ⚡ Now handle loading and error states AFTER all hooks
  if (demoModeLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!proTripId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Trip Not Found</h1>
          <p className="text-gray-400 mb-6">No trip ID provided.</p>
          <button
            onClick={() => {
              hapticService.light();
              navigate('/');
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors active:scale-95"
          >
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }
  
  if (tripsLoading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (!tripData) {
    const errorMessage = isDemoMode 
      ? "The demo trip you're looking for doesn't exist."
      : "This Pro trip doesn't exist or you don't have access.";
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Pro Trip Not Found</h1>
          <p className="text-gray-400 mb-2">{errorMessage}</p>
          {isDemoMode && <p className="text-xs text-gray-500 mb-6">Trip ID: {proTripId}</p>}
          <button
            onClick={() => {
              hapticService.light();
              navigate('/');
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors active:scale-95"
          >
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }
  
  const trip = {
    id: parseInt(tripData.id) || 0, // Fallback for numeric ID
    title: tripData.title,
    location: tripData.location,
    dateRange: tripData.dateRange,
    description: tripDescription || tripData.description || '',
    participants: tripData.participants || []
  };

  const basecamp = {
    name: tripData.basecamp_name || 'Team Base',
    address: tripData.basecamp_address || tripData.location
  };

  const handleBack = () => {
    hapticService.light();
    navigate('/');
  };

  const handleTabChange = (tab: string) => {
    hapticService.light();
    setActiveTab(tab);
  };

  return (
    <MobileErrorBoundary>
      <div className="flex flex-col min-h-screen bg-black">
      {/* Mobile Header - Sticky with iOS safe area */}
      <div 
        ref={headerRef} 
        className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10"
        style={{ 
          paddingTop: 'max(env(safe-area-inset-top, 0px), constant(safe-area-inset-top, 0px), 20px)'
        }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleBack}
              className="min-w-[44px] min-h-[44px] p-3 -ml-2 active:scale-95 transition-transform touch-manipulation flex items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            
            <button
              onClick={() => {
                hapticService.light();
                setShowOptionsSheet(true);
              }}
              className="min-w-[44px] min-h-[44px] p-3 -mr-2 active:scale-95 transition-transform touch-manipulation flex items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              <MoreVertical size={24} className="text-white" />
            </button>
          </div>
          
          <div className="text-center px-2">
            <h1 className="text-lg font-semibold text-white leading-tight mb-1.5 break-words">
              {tripData.title}
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span>{tripData.location} • {tripData.participants?.length || 0} team members</span>
              <button
                onClick={() => {
                  hapticService.light();
                  setShowTripInfo(true);
                }}
                className="flex items-center gap-1 active:scale-95 transition-transform text-blue-400 hover:text-blue-300"
                aria-label="View trip details"
              >
                <Info size={16} />
                <span className="font-medium">More Details</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Swipeable */}
      <MobileTripTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tripId={proTripId}
        basecamp={basecamp}
        variant="pro"
        participants={(tripData.participants || []).map((p) => ({
          id: String(p.id),
          name: p.name,
          role: p.role
        }))}
        tripData={tripData} // Pass full trip data for feature toggles
      />

      {/* Trip Info Drawer */}
      <MobileTripInfoDrawer
        trip={trip}
        isOpen={showTripInfo}
        onClose={() => {
          hapticService.light();
          setShowTripInfo(false);
        }}
        onDescriptionUpdate={setTripDescription}
        onShowExport={() => {
          setShowTripInfo(false);
          // Delay to let drawer close before opening modal
          setTimeout(() => setShowExportModal(true), 200);
        }}
        category={tripData.proTripCategory}
        tags={tripData.tags}
      />

      {/* Options Sheet (Three-dot menu) */}
      <MobileHeaderOptionsSheet
        isOpen={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        tripTitle={tripData?.title}
        onShare={() => {
          toast.info('Share functionality coming soon');
        }}
        onExport={() => setShowExportModal(true)}
        onSettings={() => {
          toast.info('Trip settings coming soon');
        }}
      />

      {/* Export Modal */}
      <TripExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        tripName={tripData?.title || 'Pro Trip'}
        tripId={proTripId || '1'}
      />
      </div>
    </MobileErrorBoundary>
  );
};
