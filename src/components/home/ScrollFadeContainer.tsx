import React, { useRef, useState, useEffect } from 'react';

interface ScrollFadeContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const ScrollFadeContainer = ({ children, className = '' }: ScrollFadeContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    setShowLeftFade(scrollLeft > 10);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    handleScroll(); // Initial check
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      // Check on resize
      const resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(el);
      
      return () => {
        el.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Left fade gradient */}
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 rounded-l-2xl" />
      )}
      
      {/* Scrollable content */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide scroll-touch"
      >
        {children}
      </div>
      
      {/* Right fade gradient */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 rounded-r-2xl" />
      )}
    </div>
  );
};
