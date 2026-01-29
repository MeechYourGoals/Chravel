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

  // Build accent glow overlay with dramatic gold sweeps
  const getAccentGlowStyle = () => {
    if (!accentGlow) return null;
    
    const { color, position, opacity = 0.15 } = accentGlow;
    const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0');
    
    // Create more dramatic curved gold gradients inspired by the reference
    if (position === 'top') {
      return `
        radial-gradient(ellipse 120% 50% at 50% 0%, ${color}${hexOpacity} 0%, transparent 50%),
        radial-gradient(ellipse 80% 30% at 20% 10%, rgba(244,178,58,0.08) 0%, transparent 40%),
        radial-gradient(ellipse 60% 25% at 80% 5%, rgba(255,215,0,0.06) 0%, transparent 35%)
      `;
    }
    
    if (position === 'bottom') {
      return `
        radial-gradient(ellipse 120% 50% at 50% 100%, ${color}${hexOpacity} 0%, transparent 50%),
        radial-gradient(ellipse 80% 30% at 80% 90%, rgba(244,178,58,0.08) 0%, transparent 40%)
      `;
    }
    
    // Center position - subtle ambient glow
    return `
      radial-gradient(ellipse 100% 60% at 50% 50%, ${color}${hexOpacity} 0%, transparent 55%),
      radial-gradient(ellipse 60% 40% at 30% 40%, rgba(244,178,58,0.05) 0%, transparent 40%)
    `;
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
