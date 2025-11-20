

import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
		screens: {
			'2xl': '1480px'
		}
		},
		screens: {
			// iOS-specific breakpoints for native app experience
			'xs': '375px',  // iPhone SE, 12/13 mini
			'sm': '390px',  // iPhone 12/13/14 Pro
			'md': '428px',  // iPhone 12/13/14 Pro Max
			'tablet': '768px', // iPad mini
			'lg': '1024px', // iPad Pro
			'xl': '1280px', // Desktop
			'2xl': '1600px',
		},
		extend: {
			fontFamily: {
				// Enterprise-grade font stack
				'sans': [
					'Inter', 
					'-apple-system', 
					'BlinkMacSystemFont', 
					'"SF Pro Display"', 
					'"SF Pro Text"', 
					'"Segoe UI"', 
					'Roboto', 
					'system-ui', 
					'sans-serif'
				],
				// Cinematic hero font stack
				'mono': [
					'JetBrains Mono',
					'SF Mono',
					'Monaco',
					'Courier New',
					'monospace'
				],
			},
		fontSize: {
			// Modern, bold typography scale inspired by ClarityLab
			'display': ['48px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }], // Hero text
			'h1': ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }], // Mobile
			'h1-desktop': ['40px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.01em' }], // Desktop
			'h2': ['24px', { lineHeight: '1.3', fontWeight: '600' }], // Mobile
			'h2-desktop': ['28px', { lineHeight: '1.25', fontWeight: '600' }], // Desktop
			'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }], // Mobile
			'h3-desktop': ['24px', { lineHeight: '1.35', fontWeight: '600' }], // Desktop
			'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }], // Mobile
			'body-desktop': ['17px', { lineHeight: '1.7', fontWeight: '400' }], // Desktop
			'body-large': ['18px', { lineHeight: '1.7', fontWeight: '400' }], // Subheadings
			'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
			'caption': ['14px', { lineHeight: '1.5', fontWeight: '500' }], // Labels
			// Cinematic hero typography
			'hero-mobile': ['36px', { lineHeight: '1.1', fontWeight: '900', letterSpacing: '-0.02em' }],
			'hero-desktop': ['64px', { lineHeight: '1.05', fontWeight: '900', letterSpacing: '-0.03em' }],
		},
			colors: {
				// Enterprise color system
				glass: {
					// Updated enterprise colors
					'enterprise-blue': 'hsl(223, 56%, 53%)', // #3A60D0
					'enterprise-blue-light': 'hsl(223, 50%, 60%)', // Lighter variant
					'accent-orange': 'hsl(32, 95%, 48%)', // #F57C00
					'accent-orange-light': 'hsl(32, 85%, 58%)', // #FFA726
					'slate-bg': 'hsl(223, 25%, 12%)', // #181A21
					'slate-card': 'hsl(223, 25%, 18%)', // #232B3B
					'slate-border': 'hsl(223, 15%, 25%)', // #383C4A
					'light-bg': 'hsl(223, 25%, 97%)', // #F7F8FA
					'light-border': 'hsl(223, 15%, 90%)', // #E3E7ED
					'text-primary': 'hsl(223, 35%, 20%)', // #252F4A
					green: '#62D621',
				},
				// Cinematic hero colors
				'cinematic-blue': 'hsl(217, 79%, 60%)', // #2563eb
				'cinematic-purple': 'hsl(258, 74%, 63%)', // #8b5cf6
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
					'navy-blue': 'hsl(217, 91%, 25%)', // Deep navy for Events
					'navy-blue-light': 'hsl(217, 80%, 35%)', // Lighter navy
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
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
			'none': '0',
			'sm': '0.5rem', // 8px
			'md': '0.75rem', // 12px
			'lg': '1rem', // 16px
			'xl': '1.25rem', // 20px
			'2xl': '1.5rem', // 24px
			'3xl': '2rem', // 32px
			'full': '9999px',
			// Aliases for enterprise components
			'enterprise': '1.25rem', // 20px
			'enterprise-sm': '0.75rem', // 12px
			'enterprise-lg': '1.5rem', // 24px
		},
		boxShadow: {
			// Modern elevation system with dramatic depth
			'sm': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24)',
			'md': '0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
			'lg': '0 8px 16px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.4)',
			'xl': '0 12px 24px rgba(0, 0, 0, 0.6), 0 6px 12px rgba(0, 0, 0, 0.5)',
			'2xl': '0 20px 40px rgba(0, 0, 0, 0.7), 0 10px 20px rgba(0, 0, 0, 0.6)',
			// Enterprise aliases
			'enterprise': '0 4px 16px rgba(0, 0, 0, 0.5)',
			'enterprise-md': '0 8px 24px rgba(0, 0, 0, 0.6)',
			'enterprise-lg': '0 12px 32px rgba(0, 0, 0, 0.7)',
			// Colored shadows for CTAs
			'primary-glow': '0 8px 32px rgba(58, 96, 208, 0.4), 0 4px 16px rgba(58, 96, 208, 0.3)',
			'accent-glow': '0 8px 32px rgba(245, 124, 0, 0.4), 0 4px 16px rgba(245, 124, 0, 0.3)',
			// Mobile shadows
			'mobile-nav': '0 -4px 16px rgba(0, 0, 0, 0.4)',
			'mobile-sheet': '0 -12px 32px rgba(0, 0, 0, 0.6)',
		},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'slide-in-bottom': {
					'0%': { transform: 'translateY(100%)' },
					'100%': { transform: 'translateY(0)' }
				},
				'slide-out-bottom': {
					'0%': { transform: 'translateY(0)' },
					'100%': { transform: 'translateY(100%)' }
				},
				'slide-in-up': {
					'0%': { transform: 'translateY(0)' },
					'100%': { transform: 'translateY(-100%)' }
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				// Cinematic parallax animations
				'parallax': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
				'slide-out-bottom': 'slide-out-bottom 0.3s ease-out',
				'slide-in-up': 'slide-in-up 0.3s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				// Cinematic parallax animations
				'parallax-slow': 'parallax 20s ease-in-out infinite',
				'parallax-medium': 'parallax 15s ease-in-out infinite',
				'parallax-fast': 'parallax 10s ease-in-out infinite'
			},
			backdropBlur: {
				xs: '2px',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

