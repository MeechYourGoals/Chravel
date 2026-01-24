import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { useAuth } from '../../hooks/useAuth';
import {
  AlertCircle,
  Clock,
  Lock,
  LogIn,
  Mail,
  ArrowRight,
  RefreshCw,
  Archive,
} from 'lucide-react';

/**
 * Error types for trip not found scenarios.
 * Maps to different UI states and CTAs.
 */
type TripNotFoundReason =
  | 'not_found' // Trip doesn't exist
  | 'no_access' // User doesn't have permission
  | 'auth_required' // User needs to log in
  | 'pending_approval' // User's join request is pending
  | 'archived' // Trip was archived
  | 'deleted'; // Trip was deleted

interface ProTripNotFoundProps {
  message: string;
  details?: string;
  availableIds?: string[];
  reason?: TripNotFoundReason;
  tripId?: string;
  onRetry?: () => void;
}

export const ProTripNotFound = ({
  message,
  details,
  availableIds,
  reason = 'not_found',
  tripId,
  onRetry,
}: ProTripNotFoundProps) => {
  const navigate = useNavigate();
  const { accentColors } = useTripVariant();
  const { user } = useAuth();

  const getIcon = () => {
    const iconClass = 'h-12 w-12 mx-auto mb-4';
    switch (reason) {
      case 'auth_required':
        return <LogIn className={`${iconClass} text-blue-400`} />;
      case 'pending_approval':
        return <Clock className={`${iconClass} text-yellow-400`} />;
      case 'no_access':
        return <Lock className={`${iconClass} text-yellow-400`} />;
      case 'archived':
        return <Archive className={`${iconClass} text-gray-400`} />;
      case 'deleted':
      case 'not_found':
      default:
        return <AlertCircle className={`${iconClass} text-red-400`} />;
    }
  };

  const getTitle = () => {
    switch (reason) {
      case 'auth_required':
        return 'Sign in required';
      case 'pending_approval':
        return 'Request pending';
      case 'no_access':
        return 'Access restricted';
      case 'archived':
        return 'Trip archived';
      case 'deleted':
        return 'Trip deleted';
      case 'not_found':
      default:
        return 'Trip Not Found';
    }
  };

  const handleLogin = () => {
    const returnPath = tripId ? `/tour/pro/${tripId}` : '/';
    navigate(`/auth?mode=signin&returnTo=${encodeURIComponent(returnPath)}`, { replace: true });
  };

  const handleContactHost = () => {
    // Navigate to home with a hint to contact the organizer
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {getIcon()}
        <h1 className="text-2xl font-bold text-white mb-4">{getTitle()}</h1>
        <p className="text-gray-400 mb-2">{message}</p>
        {details && <p className="text-gray-500 text-sm mb-4">{details}</p>}
        {availableIds && import.meta.env.DEV && (
          <p className="text-gray-500 text-xs mb-4">
            Debug - Available IDs: {availableIds.join(', ')}
          </p>
        )}

        {/* Primary CTA based on reason */}
        {reason === 'auth_required' && !user ? (
          <button
            onClick={handleLogin}
            className={`w-full bg-gradient-to-r ${accentColors.gradient} text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 mb-3`}
          >
            <LogIn className="h-4 w-4" />
            Log In
          </button>
        ) : reason === 'pending_approval' ? (
          <button
            onClick={() => navigate('/')}
            className={`w-full bg-gradient-to-r ${accentColors.gradient} text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 mb-3`}
          >
            <ArrowRight className="h-4 w-4" />
            View Request Status
          </button>
        ) : reason === 'no_access' ? (
          <button
            onClick={handleContactHost}
            className={`w-full bg-gradient-to-r ${accentColors.gradient} text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 mb-3`}
          >
            <Mail className="h-4 w-4" />
            Contact Host
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className={`w-full bg-gradient-to-r ${accentColors.gradient} text-white px-6 py-3 rounded-xl mb-3`}
          >
            Go to Dashboard
          </button>
        )}

        {/* Secondary CTA */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-3 rounded-xl flex items-center justify-center gap-2 mb-3 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}

        {reason !== 'auth_required' && reason !== 'pending_approval' && (
          <button
            onClick={() => navigate('/')}
            className="w-full text-gray-500 hover:text-gray-300 px-6 py-2 transition-colors"
          >
            Back to Dashboard
          </button>
        )}

        {/* Help text for specific scenarios */}
        {reason === 'pending_approval' && (
          <p className="mt-4 text-xs text-gray-500">
            The trip organizer will review your request. You'll be notified when they respond.
          </p>
        )}
        {reason === 'no_access' && (
          <p className="mt-4 text-xs text-gray-500">
            If you should have access to this trip, contact the organizer for an invite.
          </p>
        )}
      </div>
    </div>
  );
};
