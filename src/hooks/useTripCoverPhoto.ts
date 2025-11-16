
import { useState, useEffect } from 'react';
import { Trip } from '../data/tripsData';

export const useTripCoverPhoto = (trip: Trip) => {
  const [coverPhoto, setCoverPhoto] = useState<string | undefined>(trip.coverPhoto);

  const updateCoverPhoto = (photoUrl: string) => {
    setCoverPhoto(photoUrl);
    // In a real app, this would also update the backend
  };

  const removeCoverPhoto = () => {
    setCoverPhoto(undefined);
    // In a real app, this would also remove from backend
  };

  return {
    coverPhoto,
    updateCoverPhoto,
    removeCoverPhoto
  };
};
