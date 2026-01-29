import React from 'react';

interface GoldAccentOverlayProps {
  variant?: 'hero' | 'section' | 'footer';
}

export const GoldAccentOverlay: React.FC<GoldAccentOverlayProps> = ({ variant = 'section' }) => {
  if (variant === 'hero') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top curved gold sweep */}
        <svg
          className="absolute top-0 left-0 w-full h-48 md:h-64"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="goldGradientTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#FFD700" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 C360,120 720,80 1080,100 C1260,110 1380,60 1440,0 L1440,0 L0,0 Z"
            fill="url(#goldGradientTop)"
          />
        </svg>

        {/* Right side curved gold accent */}
        <svg
          className="absolute top-20 right-0 w-64 h-96 md:w-96 md:h-[500px]"
          viewBox="0 0 300 500"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="goldGradientRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#FFD700" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M300,0 Q200,100 280,200 Q320,300 250,400 Q200,480 300,500 L300,0 Z"
            fill="url(#goldGradientRight)"
          />
        </svg>

        {/* Subtle gold glow orbs */}
        <div 
          className="absolute top-10 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 70%)' }}
        />
        <div 
          className="absolute top-32 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Bottom curved gold sweep */}
        <svg
          className="absolute bottom-0 left-0 w-full h-32"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="goldGradientBottom" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,100 C360,40 720,80 1080,50 C1260,35 1380,70 1440,100 L1440,100 L0,100 Z"
            fill="url(#goldGradientBottom)"
          />
        </svg>
      </div>
    );
  }

  // Default section variant
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Subtle diagonal gold accent lines */}
      <svg
        className="absolute top-0 left-0 w-full h-full opacity-10"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="goldLine1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F4B23A" stopOpacity="0" />
            <stop offset="50%" stopColor="#F4B23A" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M-100,300 Q400,250 800,350 Q1200,450 1540,300"
          stroke="url(#goldLine1)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M-100,600 Q400,550 800,650 Q1200,750 1540,600"
          stroke="url(#goldLine1)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>

      {/* Corner gold glow */}
      <div 
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-10"
        style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 70%)' }}
      />
    </div>
  );
};
