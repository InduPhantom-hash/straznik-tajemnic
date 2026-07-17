// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        brass: 'hsl(var(--brass))',
        gold: 'hsl(var(--gold))',
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
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        mono: ['Special Elite', 'monospace'],
        'special-elite': ['Special Elite', 'monospace'],
        display: ['Cinzel', 'serif'],
        'display-decorative': ['Cinzel Decorative', 'serif'],
      },
      // Czytelnosc: podbita skala drobnych tekstow w setupach/ustawieniach (4K).
      // Nadpisuje TYLKO xs i sm - text-base/lg/xl (czat, naglowki) zostaja domyslne.
      fontSize: {
        xs: ['0.9375rem', { lineHeight: '1.375rem' }], // 12px -> 15px
        sm: ['1rem', { lineHeight: '1.5rem' }], // 14px -> 16px
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 0 0 hsl(var(--primary) / 0.7)',
          },
          '50%': {
            opacity: '0.8',
            boxShadow: '0 0 10px 2px hsl(var(--primary) / 0.3)',
          },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-180% 0' },
          '100%': { backgroundPosition: '180% 0' },
        },
      },
      animation: {
        pulse: 'pulse 4s infinite ease-in-out',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'modal-in': 'modal-in 0.22s ease-out',
        shimmer: 'shimmer 2.4s linear infinite',
      },
      boxShadow: {
        glow: '0 0 15px 5px hsl(var(--primary) / 0.2)',
        'glow-brass': '0 0 16px 2px hsl(var(--brass) / 0.25)',
        deco: '0 30px 80px rgba(0,0,0,.6), inset 0 0 120px 20px rgba(0,0,0,.55)',
      },
    },
  },
  plugins: [],
};
export default config;
