import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1480px',
      },
    },
    screens: {
      // iOS-specific breakpoints for native app experience
      xs: '375px', // iPhone SE, 12/13 mini
      sm: '390px', // iPhone 12/13/14 Pro
      md: '428px', // iPhone 12/13/14 Pro Max
      tablet: '768px', // iPad mini
      lg: '1024px', // iPad Pro
      xl: '1280px', // Desktop
      '2xl': '1600px',
      landscape: { raw: '(orientation: landscape)' },
    },
    extend: {
      fontFamily: {
        // Enterprise-grade font stack
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
        // Cinematic hero font stack
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        // Modern, bold typography scale inspired by ClarityLab
        display: ['48px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }], // Hero text
        h1: ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }], // Mobile
        'h1-desktop': ['40px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.01em' }], // Desktop
        h2: ['24px', { lineHeight: '1.3', fontWeight: '600' }], // Mobile
        'h2-desktop': ['28px', { lineHeight: '1.25', fontWeight: '600' }], // Desktop
        h3: ['20px', { lineHeight: '1.4', fontWeight: '600' }], // Mobile
        'h3-desktop': ['24px', { lineHeight: '1.35', fontWeight: '600' }], // Desktop
        body: ['16px', { lineHeight: '1.6', fontWeight: '400' }], // Mobile
        'body-desktop': ['17px', { lineHeight: '1.7', fontWeight: '400' }], // Desktop
        'body-large': ['18px', { lineHeight: '1.7', fontWeight: '400' }], // Subheadings
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['14px', { lineHeight: '1.5', fontWeight: '500' }], // Labels
        // Cinematic hero typography
        'hero-mobile': ['36px', { lineHeight: '1.1', fontWeight: '900', letterSpacing: '-0.02em' }],
        'hero-desktop': [
          '64px',
          { lineHeight: '1.05', fontWeight: '900', letterSpacing: '-0.03em' },
        ],
      },
      colors: {
        // Premium Black & Gold color system
        glass: {
          // Gold-focused enterprise colors - unified darkest gold #C4912F
          'enterprise-gold': 'hsl(38, 61%, 48%)', // #C4912F
          'enterprise-gold-light': 'hsl(38, 61%, 48%)', // Same darkest gold
          'accent-gold': 'hsl(38, 61%, 48%)', // Same darkest gold
          'accent-gold-dark': 'hsl(38, 61%, 48%)', // Dark gold
          'slate-bg': 'hsl(0, 0%, 4%)', // Pure black bg
          'slate-card': 'hsl(0, 0%, 8%)', // Dark card
          'slate-border': 'hsl(42, 20%, 15%)', // Gold-tinted border
          'light-bg': 'hsl(42, 25%, 97%)', // Light gold-tinted bg
          'light-border': 'hsl(42, 15%, 90%)', // Light gold border
          'text-primary': 'hsl(0, 0%, 100%)', // White text
          green: '#62D621',
        },
        // Gold accent colors - unified darkest gold #C4912F
        'gold-primary': 'hsl(38, 61%, 48%)',
        'gold-light': 'hsl(38, 61%, 48%)',
        'gold-dark': 'hsl(38, 61%, 48%)',
        'gold-glow': 'hsla(38, 61%, 48%, 0.3)',
        // Legacy cinematic colors (keeping for compatibility)
        'cinematic-blue': 'hsl(217, 79%, 60%)',
        'cinematic-purple': 'hsl(258, 74%, 63%)',
        // Existing color system
        glass2: {
          // Payment system colors
          'payment-primary': 'hsl(var(--payment-primary))',
          'payment-primary-foreground': 'hsl(var(--payment-primary-foreground))',
          'payment-background': 'hsl(var(--payment-background))',
          'payment-background-light': 'hsl(var(--payment-background-light))',
          'payment-border': 'hsl(var(--payment-border))',
          'payment-text': 'hsl(var(--payment-text))',
          dark: '#000000',
          light: '#FFFFFF',
          // Events theme colors
          'navy-blue': 'hsl(217, 91%, 25%)',
          'navy-blue-light': 'hsl(217, 80%, 35%)',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // On-image text tokens for guaranteed contrast on photo backgrounds
        onimg: {
          title: 'hsl(var(--on-image-title))',
          body: 'hsl(var(--on-image-body))',
          muted: 'hsl(var(--on-image-muted))',
        },
        // Midnight blue for maximum contrast on bright images
        midnight: {
          DEFAULT: 'hsl(var(--midnight-blue))',
          navy: 'hsl(var(--dark-navy))',
        },
        // iMessage-style chat bubble colors (isolated from global theme)
        'chat-own': 'hsl(var(--chat-bubble-own))',
        'chat-own-foreground': 'hsl(var(--chat-bubble-own-foreground))',
      },
      spacing: {
        // Modern spacing scale with generous breathing room
        'page-gutter-mobile': '20px',
        'page-gutter-desktop': '32px',
        'section-gap': '32px',
        'section-gap-desktop': '48px',
        'card-padding': '24px',
        'card-padding-desktop': '32px',
        'card-padding-lg': '40px',
        'button-padding-y': '16px',
        'button-padding-x': '32px',
        'touch-target': '48px',
        'mobile-nav-height': '80px',
        'safe-area-bottom': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        none: '0',
        sm: '0.5rem', // 8px
        md: '0.75rem', // 12px
        lg: '1rem', // 16px
        xl: '1.25rem', // 20px
        '2xl': '1.5rem', // 24px
        '3xl': '2rem', // 32px
        full: '9999px',
        // Aliases for enterprise components
        enterprise: '1.25rem', // 20px
        'enterprise-sm': '0.75rem', // 12px
        'enterprise-lg': '1.5rem', // 24px
      },
      boxShadow: {
        // Modern elevation system with dramatic depth
        sm: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24)',
        md: '0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
        lg: '0 8px 16px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.4)',
        xl: '0 12px 24px rgba(0, 0, 0, 0.6), 0 6px 12px rgba(0, 0, 0, 0.5)',
        '2xl': '0 20px 40px rgba(0, 0, 0, 0.7), 0 10px 20px rgba(0, 0, 0, 0.6)',
        // Enterprise aliases
        enterprise: '0 4px 16px rgba(0, 0, 0, 0.5)',
        'enterprise-md': '0 8px 24px rgba(0, 0, 0, 0.6)',
        'enterprise-lg': '0 12px 32px rgba(0, 0, 0, 0.7)',
        // Colored shadows for CTAs - darkest gold #C4912F
        'primary-glow': '0 8px 32px rgba(196, 145, 47, 0.4), 0 4px 16px rgba(196, 145, 47, 0.3)',
        'accent-glow': '0 8px 32px rgba(196, 145, 47, 0.4), 0 4px 16px rgba(196, 145, 47, 0.3)',
        'gold-glow': '0 8px 32px rgba(196, 145, 47, 0.5), 0 4px 16px rgba(196, 145, 47, 0.4)',
        // Mobile shadows
        'mobile-nav': '0 -4px 16px rgba(0, 0, 0, 0.4)',
        'mobile-sheet': '0 -12px 32px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-in-bottom': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-out-bottom': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Orientation transition animation
        'layout-shift': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Cinematic parallax animations
        parallax: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // iOS-style wiggle for reorder mode
        wiggle: {
          '0%, 100%': { transform: 'rotate(-0.5deg)' },
          '50%': { transform: 'rotate(0.5deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        float: 'float 6s ease-in-out infinite',
        'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
        'slide-out-bottom': 'slide-out-bottom 0.3s ease-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'layout-shift': 'layout-shift 0.3s ease-out',
        // Cinematic parallax animations
        'parallax-slow': 'parallax 20s ease-in-out infinite',
        'parallax-medium': 'parallax 15s ease-in-out infinite',
        'parallax-fast': 'parallax 10s ease-in-out infinite',
        wiggle: 'wiggle 0.3s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
