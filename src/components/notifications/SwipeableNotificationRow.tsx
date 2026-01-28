import React, { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableNotificationRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

export const SwipeableNotificationRow: React.FC<SwipeableNotificationRowProps> = ({
  children,
  onDelete,
  className,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0.5]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If swiped past threshold, delete
    if (info.offset.x < -100) {
      setIsDeleting(true);
      setTimeout(() => {
        onDelete();
      }, 200);
    }
  };

  if (isDeleting) {
    return (
      <motion.div
        initial={{ height: 'auto', opacity: 1 }}
        animate={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      />
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Delete action background */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-destructive"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="w-5 h-5 text-destructive-foreground" />
        </motion.div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-background cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
};
