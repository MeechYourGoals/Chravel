import React from 'react';

interface GoldAccentOverlayProps {
  variant?: 'hero' | 'waves' | 'triangles' | 'diamonds' | 'circles' | 'mesh' | 'aurora' | 'footer';
}

export const GoldAccentOverlay: React.FC<GoldAccentOverlayProps> = ({ variant = 'waves' }) => {
  // Hero - curved sweeps and glowing orbs (prominent)
  if (variant === 'hero') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top curved sweep - filled shape */}
        <svg
          className="absolute top-0 left-0 w-full h-64 md:h-80"
          viewBox="0 0 1440 250"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="heroGoldTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#FFD700" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 C360,150 720,100 1080,130 C1260,145 1380,80 1440,0 L1440,0 L0,0 Z"
            fill="url(#heroGoldTop)"
          />
        </svg>
        {/* Right side curved accent */}
        <svg
          className="absolute top-10 right-0 w-80 h-[500px] md:w-[450px] md:h-[600px]"
          viewBox="0 0 350 600"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="heroGoldRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#FFD700" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M350,0 Q220,120 300,250 Q380,380 280,480 Q200,560 350,600 L350,0 Z"
            fill="url(#heroGoldRight)"
          />
        </svg>
        {/* Prominent glow orbs */}
        <div 
          className="absolute top-16 left-1/4 w-80 h-80 rounded-full blur-2xl opacity-30"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 60%)' }}
        />
        <div 
          className="absolute top-40 right-1/4 w-64 h-64 rounded-full blur-2xl opacity-25"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 60%)' }}
        />
        <div 
          className="absolute top-20 right-10 w-48 h-48 rounded-full blur-xl opacity-35"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 65%)' }}
        />
      </div>
    );
  }

  // Waves - flowing horizontal waves with filled shapes
  if (variant === 'waves') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute top-1/4 left-0 w-full h-80 opacity-50"
          viewBox="0 0 1440 300"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="waveFill1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#F4B23A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="waveStroke1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#FFD700" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Filled wave shape */}
          <path
            d="M0,150 Q360,80 720,150 T1440,150 L1440,220 Q1080,280 720,220 T0,220 Z"
            fill="url(#waveFill1)"
          />
          {/* Top wave stroke */}
          <path
            d="M0,120 Q360,50 720,120 T1440,120"
            stroke="url(#waveStroke1)"
            strokeWidth="5"
            fill="none"
          />
          {/* Middle wave stroke */}
          <path
            d="M0,160 Q360,100 720,160 T1440,160"
            stroke="url(#waveStroke1)"
            strokeWidth="4"
            fill="none"
            opacity="0.7"
          />
          {/* Bottom wave stroke */}
          <path
            d="M0,200 Q360,150 720,200 T1440,200"
            stroke="url(#waveStroke1)"
            strokeWidth="3"
            fill="none"
            opacity="0.5"
          />
        </svg>
        {/* Glow orbs */}
        <div 
          className="absolute bottom-20 left-10 w-64 h-64 rounded-full blur-2xl opacity-25"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 60%)' }}
        />
        <div 
          className="absolute top-1/3 right-20 w-48 h-48 rounded-full blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 60%)' }}
        />
      </div>
    );
  }

  // Triangles - bold geometric triangle patterns
  if (variant === 'triangles') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute top-0 right-0 w-full h-full opacity-45"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="triGold1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="triGold2" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Large top-right triangle */}
          <polygon points="1100,0 1440,0 1440,300" fill="url(#triGold1)" />
          {/* Secondary top-right triangle */}
          <polygon points="1000,0 1440,0 1440,180 1200,0" fill="url(#triGold1)" opacity="0.6" />
          {/* Bottom-left triangles */}
          <polygon points="0,600 0,900 300,900" fill="url(#triGold2)" />
          <polygon points="0,700 0,900 180,900" fill="url(#triGold2)" opacity="0.7" />
          {/* Accent triangles */}
          <polygon points="100,100 180,180 100,180" fill="url(#triGold1)" opacity="0.4" />
          <polygon points="1300,700 1380,780 1300,780" fill="url(#triGold2)" opacity="0.5" />
        </svg>
        {/* Glow accents */}
        <div 
          className="absolute top-20 right-40 w-56 h-56 rounded-full blur-2xl opacity-30"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 60%)' }}
        />
        <div 
          className="absolute bottom-32 left-20 w-48 h-48 rounded-full blur-2xl opacity-25"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 60%)' }}
        />
      </div>
    );
  }

  // Diamonds - larger scattered diamond shapes with glows
  if (variant === 'diamonds') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-50"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <radialGradient id="diamondGlow1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#F4B23A" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="diamondFill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Large diamonds with glow halos */}
          <circle cx="120" cy="220" r="80" fill="url(#diamondGlow1)" opacity="0.4" />
          <polygon points="120,160 180,220 120,280 60,220" fill="url(#diamondFill)" />
          
          <circle cx="1320" cy="150" r="100" fill="url(#diamondGlow1)" opacity="0.35" />
          <polygon points="1320,80 1400,150 1320,220 1240,150" fill="url(#diamondFill)" opacity="0.9" />
          
          <circle cx="250" cy="680" r="90" fill="url(#diamondGlow1)" opacity="0.3" />
          <polygon points="250,610 330,680 250,750 170,680" fill="url(#diamondFill)" opacity="0.7" />
          
          <circle cx="1150" cy="550" r="70" fill="url(#diamondGlow1)" opacity="0.35" />
          <polygon points="1150,490 1210,550 1150,610 1090,550" fill="url(#diamondFill)" opacity="0.8" />
          
          {/* Small accent diamonds */}
          <polygon points="700,80 740,120 700,160 660,120" fill="url(#diamondFill)" opacity="0.5" />
          <polygon points="900,750 930,780 900,810 870,780" fill="url(#diamondFill)" opacity="0.4" />
        </svg>
        {/* Additional glow orbs */}
        <div 
          className="absolute top-32 left-1/4 w-56 h-56 rounded-full blur-2xl opacity-25"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 60%)' }}
        />
        <div 
          className="absolute bottom-40 right-1/4 w-72 h-72 rounded-full blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 60%)' }}
        />
      </div>
    );
  }

  // Circles - floating bubble orbs with strong gradients
  if (variant === 'circles') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-45"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <radialGradient id="bubbleGold1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#F4B23A" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bubbleGold2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#FFD700" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bubbleGold3" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#F4B23A" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Large floating circles */}
          <circle cx="180" cy="180" r="120" fill="url(#bubbleGold1)" />
          <circle cx="1280" cy="220" r="160" fill="url(#bubbleGold2)" />
          <circle cx="220" cy="720" r="100" fill="url(#bubbleGold3)" />
          <circle cx="1180" cy="650" r="140" fill="url(#bubbleGold1)" />
          {/* Medium circles */}
          <circle cx="720" cy="120" r="70" fill="url(#bubbleGold2)" opacity="0.7" />
          <circle cx="600" cy="800" r="80" fill="url(#bubbleGold1)" opacity="0.6" />
          {/* Small accent circles */}
          <circle cx="400" cy="350" r="40" fill="url(#bubbleGold3)" opacity="0.5" />
          <circle cx="1050" cy="400" r="50" fill="url(#bubbleGold2)" opacity="0.5" />
          <circle cx="850" cy="500" r="35" fill="url(#bubbleGold1)" opacity="0.4" />
        </svg>
        {/* Background glow */}
        <div 
          className="absolute top-1/2 left-16 w-80 h-80 rounded-full blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 60%)' }}
        />
        <div 
          className="absolute top-1/4 right-20 w-64 h-64 rounded-full blur-2xl opacity-25"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 60%)' }}
        />
      </div>
    );
  }

  // Mesh - interconnected grid lines with intersection glows
  if (variant === 'mesh') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-35"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="meshLine1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#F4B23A" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#FFD700" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="meshLine2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.1" />
              <stop offset="40%" stopColor="#FFD700" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#F4B23A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.1" />
            </linearGradient>
            <radialGradient id="meshGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Diagonal grid lines */}
          <line x1="0" y1="150" x2="1440" y2="450" stroke="url(#meshLine1)" strokeWidth="3" />
          <line x1="0" y1="350" x2="1440" y2="650" stroke="url(#meshLine1)" strokeWidth="2.5" opacity="0.7" />
          <line x1="0" y1="550" x2="1440" y2="250" stroke="url(#meshLine2)" strokeWidth="3" />
          <line x1="0" y1="750" x2="1440" y2="450" stroke="url(#meshLine2)" strokeWidth="2.5" opacity="0.7" />
          {/* Vertical accent lines */}
          <line x1="300" y1="0" x2="450" y2="900" stroke="url(#meshLine1)" strokeWidth="2" opacity="0.5" />
          <line x1="1100" y1="0" x2="1250" y2="900" stroke="url(#meshLine2)" strokeWidth="2" opacity="0.5" />
          {/* Intersection glows */}
          <circle cx="520" cy="350" r="30" fill="url(#meshGlow)" />
          <circle cx="920" cy="450" r="25" fill="url(#meshGlow)" opacity="0.8" />
          <circle cx="380" cy="550" r="20" fill="url(#meshGlow)" opacity="0.6" />
          <circle cx="1060" cy="350" r="22" fill="url(#meshGlow)" opacity="0.7" />
        </svg>
        {/* Background glows */}
        <div 
          className="absolute -top-20 right-1/4 w-96 h-96 rounded-full blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 60%)' }}
        />
        <div 
          className="absolute bottom-20 left-1/3 w-72 h-72 rounded-full blur-2xl opacity-18"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 60%)' }}
        />
      </div>
    );
  }

  // Aurora - flowing aurora bands with thick strokes
  if (variant === 'aurora') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-55"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="auroraGold1" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.05" />
              <stop offset="25%" stopColor="#F4B23A" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#FFD700" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#F4B23A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="auroraGold2" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.05" />
              <stop offset="30%" stopColor="#FFD700" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#F4B23A" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* Main aurora band */}
          <path
            d="M0,280 Q300,180 600,300 Q900,420 1200,280 Q1350,200 1440,250"
            stroke="url(#auroraGold1)"
            strokeWidth="80"
            fill="none"
            strokeLinecap="round"
          />
          {/* Secondary aurora band */}
          <path
            d="M0,520 Q250,620 500,480 Q750,340 1000,500 Q1200,620 1440,540"
            stroke="url(#auroraGold2)"
            strokeWidth="60"
            fill="none"
            opacity="0.7"
            strokeLinecap="round"
          />
          {/* Tertiary subtle band */}
          <path
            d="M0,700 Q400,780 720,680 Q1000,580 1440,720"
            stroke="url(#auroraGold1)"
            strokeWidth="40"
            fill="none"
            opacity="0.4"
            strokeLinecap="round"
          />
        </svg>
        {/* Prominent glow orbs */}
        <div 
          className="absolute top-1/4 right-16 w-96 h-96 rounded-full blur-2xl opacity-25"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 60%)' }}
        />
        <div 
          className="absolute bottom-1/4 left-20 w-80 h-80 rounded-full blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 60%)' }}
        />
      </div>
    );
  }

  // Footer variant - bold bottom sweep
  if (variant === 'footer') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 w-full h-48"
          viewBox="0 0 1440 150"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="footerGold" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F4B23A" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#FFD700" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F4B23A" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M0,150 C360,60 720,100 1080,70 C1260,55 1380,90 1440,150 L1440,150 L0,150 Z"
            fill="url(#footerGold)"
          />
        </svg>
        {/* Glow accents */}
        <div 
          className="absolute top-20 left-1/4 w-64 h-64 rounded-full blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, #F4B23A 0%, transparent 60%)' }}
        />
        <div 
          className="absolute top-10 right-1/3 w-48 h-48 rounded-full blur-2xl opacity-18"
          style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 60%)' }}
        />
      </div>
    );
  }

  return null;
};
