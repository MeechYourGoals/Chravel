import React from 'react';

interface GoldAccentOverlayProps {
  variant?: 'hero' | 'waves' | 'triangles' | 'diamonds' | 'circles' | 'mesh' | 'aurora' | 'footer';
}

export const GoldAccentOverlay: React.FC<GoldAccentOverlayProps> = ({ variant = 'waves' }) => {
  // Hero - curved sweeps and glowing orbs (existing)
  if (variant === 'hero') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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

  // Waves - flowing horizontal waves
  if (variant === 'waves') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute top-1/4 left-0 w-full h-64 opacity-20"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="waveGold1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0" />
              <stop offset="50%" stopColor="#F4B23A" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,100 Q360,50 720,100 T1440,100"
            stroke="url(#waveGold1)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0,130 Q360,80 720,130 T1440,130"
            stroke="url(#waveGold1)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
          />
        </svg>
        <div 
          className="absolute bottom-20 left-10 w-48 h-48 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  // Triangles - geometric triangle patterns
  if (variant === 'triangles') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute top-0 right-0 w-full h-full opacity-15"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="triGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="1200,0 1440,150 1440,0" fill="url(#triGold)" />
          <polygon points="1100,0 1300,200 1440,50 1440,0" fill="url(#triGold)" opacity="0.5" />
          <polygon points="0,700 200,900 0,900" fill="url(#triGold)" opacity="0.3" />
        </svg>
        <div 
          className="absolute top-1/3 right-20 w-32 h-32 rounded-full blur-2xl opacity-15"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  // Diamonds - scattered diamond shapes
  if (variant === 'diamonds') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-12"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="diamondGold" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <polygon points="100,200 150,250 100,300 50,250" fill="url(#diamondGold)" />
          <polygon points="1300,100 1350,150 1300,200 1250,150" fill="url(#diamondGold)" opacity="0.7" />
          <polygon points="200,600 270,670 200,740 130,670" fill="url(#diamondGold)" opacity="0.4" />
          <polygon points="1100,500 1140,540 1100,580 1060,540" fill="url(#diamondGold)" opacity="0.5" />
        </svg>
        <div 
          className="absolute top-20 left-1/4 w-40 h-40 rounded-full blur-3xl opacity-12"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-32 right-1/3 w-56 h-56 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  // Circles - floating bubble orbs
  if (variant === 'circles') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-15"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <radialGradient id="circleGold1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="circleGold2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="150" cy="150" r="80" fill="url(#circleGold1)" />
          <circle cx="1300" cy="200" r="120" fill="url(#circleGold2)" />
          <circle cx="200" cy="700" r="60" fill="url(#circleGold1)" />
          <circle cx="1200" cy="600" r="100" fill="url(#circleGold2)" />
          <circle cx="700" cy="100" r="40" fill="url(#circleGold1)" opacity="0.5" />
        </svg>
        <div 
          className="absolute top-1/2 left-10 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  // Mesh - interconnected grid lines
  if (variant === 'mesh') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="meshGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0" />
              <stop offset="30%" stopColor="#F4B23A" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#FFD700" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="200" x2="1440" y2="400" stroke="url(#meshGold)" strokeWidth="1" />
          <line x1="0" y1="400" x2="1440" y2="200" stroke="url(#meshGold)" strokeWidth="1" />
          <line x1="200" y1="0" x2="400" y2="900" stroke="url(#meshGold)" strokeWidth="1" opacity="0.5" />
          <line x1="1000" y1="0" x2="1200" y2="900" stroke="url(#meshGold)" strokeWidth="1" opacity="0.5" />
        </svg>
        <div 
          className="absolute -top-10 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-12"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-10 left-1/3 w-48 h-48 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  // Aurora - flowing aurora-like gradients
  if (variant === 'aurora') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="auroraGold1" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0" />
              <stop offset="30%" stopColor="#F4B23A" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#FFD700" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,300 Q400,200 720,350 T1440,250"
            stroke="url(#auroraGold1)"
            strokeWidth="60"
            fill="none"
            opacity="0.4"
          />
          <path
            d="M0,500 Q400,600 720,450 T1440,550"
            stroke="url(#auroraGold1)"
            strokeWidth="40"
            fill="none"
            opacity="0.3"
          />
        </svg>
        <div 
          className="absolute top-1/4 right-10 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  // Footer variant
  if (variant === 'footer') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
        <div 
          className="absolute top-10 left-1/4 w-40 h-40 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  return null;
};
