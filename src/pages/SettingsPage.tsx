import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SettingsMenu } from '../components/SettingsMenu';

const SettingsPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Support deep-linking to a specific consumer section (e.g., 'integrations')
  const initialSection = (location.state as { section?: string } | null)?.section;

  const handleClose = useCallback(() => {
    setIsMenuOpen(false);
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <SettingsMenu
      isOpen={isMenuOpen}
      onClose={handleClose}
      initialConsumerSection={initialSection}
    />
  );
};

export default SettingsPage;
