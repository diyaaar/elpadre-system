/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        background: {
          DEFAULT: '#06060a',
          secondary: '#0d0d14',
          tertiary: '#16161f',
          elevated: '#1e1e2a',
        },
        primary: {
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
          light: '#a78bfa',
          glow: 'rgba(139, 92, 246, 0.15)',
        },
        secondary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
          light: '#60a5fa',
        },
        success: {
          DEFAULT: '#10b981',
          dark: '#059669',
          light: '#34d399',
        },
        warning: {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
          light: '#fbbf24',
        },
        danger: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          light: '#f87171',
        },
        text: {
          primary: '#f0f0f5',
          secondary: '#c4c4d4',
          tertiary: '#6e6e8a',
        },
        glass: {
          border: 'rgba(255, 255, 255, 0.06)',
          bg: 'rgba(255, 255, 255, 0.03)',
          hover: 'rgba(255, 255, 255, 0.06)',
        },
      },
      animation: {
        'fadeIn': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slideUp': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      scale: {
        '102': '1.02',
        '98': '0.98',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'glass-lg': '0 8px 32px rgba(0, 0, 0, 0.15)',
        'glow-primary': '0 0 20px rgba(139, 92, 246, 0.2)',
        'glow-primary-lg': '0 0 40px rgba(139, 92, 246, 0.15)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
}
