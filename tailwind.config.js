/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      // Custom spacing scale (4px base unit)
      spacing: {
        '18': '4.5rem', // 72px
        '88': '22rem',  // 352px
      },
      // Typography scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0' }],     // 14px
        'base': ['1rem', { lineHeight: '1.75', letterSpacing: '0' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0' }],     // 18px
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '0' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }], // 30px
      },
      // Custom colors for design system
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Vibrant blue for Add buttons
        'add-blue': '#0056FF',
        'add-blue-hover': '#0044CC',
        // Breadcrumb colors
        breadcrumb: {
          green: '#10B981',
          purple: '#9333EA',
          blue: '#0056FF',
          violet: '#7C3AED',
          indigo: '#6366F1',
          grey: '#374151',
        },
      },
      // Border radius scale
      borderRadius: {
        'sm': '2px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
      // Box shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-scale': 'fadeInScale 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

