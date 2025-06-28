import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2rem",
        "2xl": "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Custom breakpoints for mobile optimization
      'mobile': {'max': '480px'},
      'tablet': {'min': '481px', 'max': '768px'},
      'desktop': {'min': '769px'},
      // iPhone specific breakpoints
      'iphone-se': {'max': '375px'},
      'iphone': {'min': '376px', 'max': '414px'},
      'iphone-plus': {'min': '415px', 'max': '480px'},
    },
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['monospace', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
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
        premium: {
          purple: '#BB86FC',
          teal: '#03DAC6',
          smoke: 'rgba(40, 40, 60, 0.3)',
          glass: 'rgba(20, 20, 35, 0.8)',
          glow: 'rgba(255, 255, 255, 0.18)',
        },
      },
      borderRadius: {
        // Use fixed values instead of CSS variables to prevent warnings
        lg: '0.5rem',
        md: '0.375rem', 
        sm: '0.25rem',
      },
      boxShadow: {
        'card-glow-dark': '0px 0px 20px -7px hsla(163, 50%, 35%, 0.22)',
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
        // Add loading animation for skeletons
        'skeleton-loading': {
          '0%': {
            'background-color': 'hsl(200, 20%, 80%)',
          },
          '100%': {
            'background-color': 'hsl(200, 20%, 95%)',
          },
        },
        // Add spin animation
        'spin': {
          'to': {
            transform: 'rotate(360deg)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'skeleton-loading': 'skeleton-loading 1s linear infinite alternate',
        'spin': 'spin 0.6s linear infinite',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        // Add sidebar spacing utilities
        'sidebar-collapsed': '60px',
        'sidebar-expanded': '240px',
      },
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      // Add sidebar-specific utilities
      margin: {
        'sidebar-collapsed': '60px',
        'sidebar-expanded': '240px',
      },
      // Add transition utilities
      transitionProperty: {
        'sidebar': 'margin-left, width',
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Add plugin for custom utilities
    function({ addUtilities }: any) {
      const newUtilities = {
        // Main content spacing utilities
        '.main-content': {
          'margin-left': '60px',
          'padding': '1rem',
          'transition': 'margin-left 0.3s ease',
          'min-height': '100vh',
        },
        '.sidebar-expanded .main-content': {
          'margin-left': '240px',
        },
        // Mobile responsive
        '@media (max-width: 768px)': {
          '.main-content': {
            'margin-left': '0',
            'padding': '1rem',
            'padding-top': '70px',
          },
          '.sidebar-expanded .main-content': {
            'margin-left': '0',
          },
        },
        // Page title utilities
        '.page-title': {
          'margin-bottom': '1.5rem',
          'font-size': '1.875rem',
          'font-weight': '700',
          'color': 'hsl(var(--foreground))',
        },
        '@media (max-width: 768px)': {
          '.page-title': {
            'font-size': '1.5rem',
            'margin-bottom': '1rem',
          },
        },
        // Touch-friendly utilities
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
        },
        '.touch-target-lg': {
          'min-height': '48px',
          'min-width': '48px',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};

export default config;