import React, { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Calendar, Clock } from 'lucide-react';

interface CountdownBadgeProps {
  targetDate: string;
  tripName?: string;
  className?: string;
}

export const CountdownBadge = ({ targetDate, tripName, className }: CountdownBadgeProps) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, isExpired: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      isExpired: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <Badge variant="secondary" className={className}>
        <Calendar size={12} className="mr-1" />
        Trip Started!
      </Badge>
    );
  }

  // Different display modes based on time remaining
  if (timeLeft.days > 30) {
    return (
      <Badge variant="outline" className={className}>
        <Calendar size={12} className="mr-1" />
        {timeLeft.days} days left
      </Badge>
    );
  }

  if (timeLeft.days > 7) {
    return (
      <Badge variant="secondary" className={className}>
        <Calendar size={12} className="mr-1" />
        {timeLeft.days} days left
      </Badge>
    );
  }

  if (timeLeft.days > 1) {
    return (
      <Badge variant="default" className={`${className} animate-pulse`}>
        <Calendar size={12} className="mr-1" />
        {timeLeft.days} days left
      </Badge>
    );
  }

  if (timeLeft.days === 1) {
    return (
      <Badge
        variant="default"
        className={`${className} animate-bounce bg-gradient-to-r from-orange-500 to-red-500`}
      >
        <Calendar size={12} className="mr-1" />
        Tomorrow!
      </Badge>
    );
  }

  // Less than 24 hours - show hours
  return (
    <Badge
      variant="default"
      className={`${className} animate-pulse bg-gradient-to-r from-red-500 to-pink-500`}
    >
      <Clock size={12} className="mr-1" />
      {timeLeft.hours}h {timeLeft.minutes}m left
    </Badge>
  );
};
