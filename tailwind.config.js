/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0F766E', // Primary Deep Teal
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        brand: {
          teal: '#0F766E',
          tealDark: '#0D645D',
          indigo: '#4F46E5',
          indigoDark: '#4338CA',
        },
        verified: {
          light: '#dcfce7',
          DEFAULT: '#10b981',
          dark: '#059669',
          text: '#065f46',
        },
        pending: {
          light: '#fef3c7',
          DEFAULT: '#f59e0b',
          dark: '#d97706',
          text: '#92400e',
        },
        emergency: {
          light: '#fee2e2',
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          text: '#991b1b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(15, 118, 110, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 30px -4px rgba(15, 118, 110, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
        'glow-teal': '0 0 25px -5px rgba(15, 118, 110, 0.4)',
        'glow-indigo': '0 0 25px -5px rgba(79, 70, 229, 0.4)',
        'glow-red': '0 0 25px -5px rgba(239, 68, 68, 0.5)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'scan': {
          '0%, 100%': { top: '0%' },
          '50%': { top: '100%' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'hologram': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        }
      },
      animation: {
        'scan-line': 'scan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'hologram-shim': 'hologram 6s ease infinite',
      }
    },
  },
  plugins: [],
}
