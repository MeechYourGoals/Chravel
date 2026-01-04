import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripVariant } from '../../contexts/TripVariantContext';

interface ProTripNotFoundProps {
  message: string;
  details?: string;
  availableIds?: string[];
}

export const ProTripNotFound = ({ message, details, availableIds }: ProTripNotFoundProps) => {
  const navigate = useNavigate();
  const { accentColors } = useTripVariant();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Trip Not Found</h1>
        <p className="text-gray-400 mb-2">{message}</p>
        {details && <p className="text-gray-400 mb-4">{details}</p>}
        {availableIds && (
          <p className="text-gray-400 mb-4">Available IDs: {availableIds.join(', ')}</p>
        )}
        <button
          onClick={() => navigate('/')}
          className={`bg-gradient-to-r ${accentColors.gradient} text-white px-6 py-3 rounded-xl`}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};
