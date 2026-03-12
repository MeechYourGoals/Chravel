import React from 'react';
import { SettingsMenu } from '../SettingsMenu';
import { InviteModal } from '../InviteModal';
import { AuthModal } from '../AuthModal';
import { TripSettings } from '../TripSettings';
import { PlusUpsellModal } from '../PlusUpsellModal';

interface TripDetailModalsProps {
  showSettings: boolean;
  onCloseSettings: () => void;
  showInvite: boolean;
  onCloseInvite: () => void;
  showAuth: boolean;
  onCloseAuth: () => void;
  showTripSettings: boolean;
  onCloseTripSettings: () => void;
  showTripsPlusModal: boolean;
  onCloseTripsPlusModal: () => void;
  tripName: string;
  tripId: string;
  userId?: string;
}

export const TripDetailModals = ({
  showSettings,
  onCloseSettings,
  showInvite,
  onCloseInvite,
  showAuth,
  onCloseAuth,
  showTripSettings,
  onCloseTripSettings,
  showTripsPlusModal,
  onCloseTripsPlusModal,
  tripName,
  tripId,
  userId,
}: TripDetailModalsProps) => {
  return (
    <>
      <SettingsMenu isOpen={showSettings} onClose={onCloseSettings} />
      <InviteModal
        isOpen={showInvite}
        onClose={onCloseInvite}
        tripName={tripName}
        tripId={tripId}
      />
      <AuthModal isOpen={showAuth} onClose={onCloseAuth} />
      <TripSettings
        isOpen={showTripSettings}
        onClose={onCloseTripSettings}
        tripId={tripId}
        tripName={tripName}
        currentUserId={userId || '4'}
      />
      <PlusUpsellModal isOpen={showTripsPlusModal} onClose={onCloseTripsPlusModal} />
    </>
  );
};
