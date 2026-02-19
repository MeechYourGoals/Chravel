import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsMenu } from '../components/SettingsMenu';
import { useIsMobile } from '../hooks/use-mobile';

const SettingsPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    setIsMenuOpen(false);
    // Navigate away to prevent blank screen when user closes settings
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // On mobile, show full SettingsMenu; on close, navigate back
  if (isMobile) {
    return <SettingsMenu isOpen={isMenuOpen} onClose={handleClose} />;
  }

  // On desktop, redirect to home since settings are handled via the SettingsMenu overlay
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="text-gray-400">Please use the settings menu in the top navigation</p>
      </div>
    </div>
  );
};

export default SettingsPage;
