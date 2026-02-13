import React, { useState } from 'react';
import { Shield, Lock, AlertTriangle, Users, Settings } from 'lucide-react';
import { PrivacyMode, getPrivacyModeInfo, TripPrivacyConfig } from '../types/privacy';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { PrivacyIndicator } from './PrivacyIndicator';
import { toast } from 'sonner';

interface TripPrivacySettingsProps {
  tripId: string;
  currentConfig: TripPrivacyConfig;
  userRole: 'admin' | 'organizer' | 'member' | 'viewer';
  onConfigUpdate: (newConfig: TripPrivacyConfig) => void;
}

export const TripPrivacySettings = ({
  tripId: _tripId,
  currentConfig,
  userRole,
  onConfigUpdate,
}: TripPrivacySettingsProps) => {
  const [pendingMode, setPendingMode] = useState<PrivacyMode | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canManagePrivacy =
    ['admin', 'organizer'].includes(userRole) && currentConfig.can_change_privacy;

  const handlePrivacyModeChange = (newMode: PrivacyMode) => {
    if (newMode === currentConfig.privacy_mode) return;

    setPendingMode(newMode);
    setShowConfirmDialog(true);
  };

  const confirmPrivacyChange = async () => {
    if (!pendingMode) return;

    setIsLoading(true);
    try {
      // Simulate API call to update privacy settings
      const updatedConfig: TripPrivacyConfig = {
        ...currentConfig,
        privacy_mode: pendingMode,
        ai_access_enabled: currentConfig.ai_access_enabled,
        participants_notified: false, // Will be notified after change
      };

      onConfigUpdate(updatedConfig);

      toast.success(
        `Privacy mode changed to ${getPrivacyModeInfo(pendingMode).label}. All participants will be notified.`,
      );

      setShowConfirmDialog(false);
      setPendingMode(null);
    } catch {
      toast.error('Failed to update privacy settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pendingModeInfo = pendingMode ? getPrivacyModeInfo(pendingMode) : null;

  return (
    <div className="space-y-6">
      {/* Current Privacy Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="text-blue-400" size={20} />
            Privacy & Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrivacyIndicator privacyMode={currentConfig.privacy_mode} variant="detailed" />

          {!currentConfig.participants_notified && (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="text-amber-400" size={16} />
              <AlertDescription className="text-amber-300">
                Privacy settings were recently changed. Some participants may not be aware of the
                current privacy mode.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Privacy Mode Controls */}
      {canManagePrivacy && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="text-slate-400" size={20} />
              Change Privacy Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {Object.entries({
                standard: getPrivacyModeInfo('standard'),
                high: getPrivacyModeInfo('high'),
              }).map(([mode, info]) => (
                <Card
                  key={mode}
                  className={`cursor-pointer transition-all border-2 ${
                    currentConfig.privacy_mode === mode
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                  }`}
                  onClick={() => handlePrivacyModeChange(mode as PrivacyMode)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{info.icon}</div>
                        <div>
                          <h4 className="font-semibold text-white">{info.label}</h4>
                          <p className="text-sm text-slate-400">{info.description}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          currentConfig.privacy_mode === mode
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-400'
                        }`}
                      >
                        {currentConfig.privacy_mode === mode && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Permissions */}
      {!canManagePrivacy && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <Alert className="border-slate-600/50">
              <Users className="text-slate-400" size={16} />
              <AlertDescription className="text-slate-300">
                Only trip organizers can change privacy settings.
                {!currentConfig.can_change_privacy &&
                  ' Privacy changes have been locked for this trip.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Privacy Mode Change</DialogTitle>
            <DialogDescription className="text-slate-400">
              You're about to change the privacy mode for this trip. This will affect all
              participants.
            </DialogDescription>
          </DialogHeader>

          {pendingModeInfo && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-400">Current:</span>
                <PrivacyIndicator privacyMode={currentConfig.privacy_mode} variant="badge" />
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <span className="text-slate-400">New:</span>
                <PrivacyIndicator privacyMode={pendingMode} variant="badge" />
              </div>

              {pendingMode === 'standard' && currentConfig.privacy_mode === 'high' && (
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <AlertTriangle className="text-amber-400" size={16} />
                  <AlertDescription className="text-amber-300">
                    <strong>Important:</strong> Switching to Standard Privacy reduces message
                    protection from end-to-end encryption to server-side encryption.
                  </AlertDescription>
                </Alert>
              )}

              {pendingMode === 'high' && currentConfig.privacy_mode === 'standard' && (
                <Alert className="border-green-500/30 bg-green-500/10">
                  <Lock className="text-green-400" size={16} />
                  <AlertDescription className="text-green-300">
                    <strong>Enhanced Security:</strong> Switching to High Privacy enables end-to-end
                    encryption. AI access can remain enabled unless admins disable it.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPrivacyChange}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Updating...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
