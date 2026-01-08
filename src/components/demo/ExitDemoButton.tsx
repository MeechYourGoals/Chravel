import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDemoMode } from '@/hooks/useDemoMode';
import { ExitDemoModal } from './ExitDemoModal';

export const ExitDemoButton: React.FC = () => {
  const { isDemoMode } = useDemoMode();
  const [showModal, setShowModal] = useState(false);
  const isMobile = useIsMobile();

  if (!isDemoMode) return null;

  return (
    <>
      <AnimatePresence>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={() => setShowModal(true)}
          className={`
            fixed z-50 flex items-center gap-1.5 
            px-3 py-1.5 
            bg-background/80 backdrop-blur-sm 
            border border-orange-500/30 
            rounded-lg shadow-lg
            text-orange-600 dark:text-orange-400
            hover:bg-orange-500/10 hover:border-orange-500/50
            transition-colors duration-200
            text-xs font-medium
            ${isMobile 
              ? 'bottom-20 right-3' 
              : 'top-4 right-4'
            }
          `}
          style={isMobile ? {
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            right: 'calc(12px + env(safe-area-inset-right, 0px))',
          } : undefined}
        >
          <LogOut size={14} />
          <span>Exit Demo</span>
        </motion.button>
      </AnimatePresence>

      <ExitDemoModal 
        open={showModal} 
        onOpenChange={setShowModal} 
      />
    </>
  );
};
