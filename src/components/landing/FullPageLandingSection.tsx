import React from 'react';
import { cn } from '@/lib/utils';

interface FullPageLandingSectionProps {
  id: string;
  enableSnapScroll?: boolean;
  minHeight?: string;
  children: React.ReactNode;
  className?: string;
  backgroundStyle?: 'gradient' | 'solid';
  gradientColors?: [string, string, string?]; // Start, end, optional mid
  gradientDirection?: 'diagonal' | 'vertical' | 'radial';
  accentGlow?: {
    color: string;
    position: 'top' | 'bottom' | 'center';
    opacity?: number;
  };
}

export const FullPageLandingSection: React.FC<FullPageLandingSectionProps> = ({
  id,
  enableSnapScroll = true,
  minHeight = '100vh',
  children,
  className,
  backgroundStyle = 'gradient',
  gradientColors = ['#0a0a14', '#1a1a2e'],
  gradientDirection = 'diagonal',
  accentGlow
}) => {
  // Build the gradient based on direction and colors
  const getGradientStyle = () => {
    const [start, end, mid] = gradientColors;
    
    if (gradientDirection === 'radial') {
      return mid 
        ? `radial-gradient(ellipse at center, ${mid} 0%, ${start} 50%, ${end} 100%)`
        : `radial-gradient(ellipse at center bottom, ${start} 0%, ${end} 100%)`;
    }
    
    if (gradientDirection === 'vertical') {
      return mid
        ? `linear-gradient(180deg, ${start} 0%, ${mid} 50%, ${end} 100%)`
        : `linear-gradient(180deg, ${start} 0%, ${end} 100%)`;
    }
    
    // Default: diagonal
    return mid
      ? `linear-gradient(135deg, ${start} 0%, ${mid} 50%, ${end} 100%)`
      : `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
  };

  // Build accent glow overlay
  const getAccentGlowStyle = () => {
    if (!accentGlow) return null;
    
    const { color, position, opacity = 0.15 } = accentGlow;
    const positionMap = {
      top: 'at center top',
      bottom: 'at center bottom', 
      center: 'at center center'
    };
    
    return `radial-gradient(ellipse ${positionMap[position]}, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)`;
  };

  const accentStyle = getAccentGlowStyle();

  return (
    <section
      id={id}
      className={cn(
        'relative w-full flex',
        // Mobile: content flows from top naturally. Desktop: vertically centered
        'items-start md:items-center justify-center',
        // Mobile: fill viewport so content starts at top. Desktop: use CSS variable for min-height
        'min-h-screen md:min-h-[var(--section-desktop-min-height,100vh)]',
        // Add top padding on mobile to account for header and safe areas
        'pt-20 md:pt-0',
        className
      )}
      style={{
        ['--section-desktop-min-height' as string]: minHeight,
        background: getGradientStyle()
      }}
    >
      {/* Accent glow overlay */}
      {accentStyle && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: accentStyle }}
        />
      )}

      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </section>
  );
};
