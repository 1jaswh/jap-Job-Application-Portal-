/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        uganda: {
          black: '#000000',
          yellow: '#FCD116',
          red: '#D91027',
        }
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontSize: {
        'fluid-sm': 'clamp(0.875rem, 0.875rem + 0vw, 1rem)',
        'fluid-base': 'clamp(1rem, 1rem + 0vw, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 1.125rem + 0.5vw, 1.25rem)',
        'fluid-xl': 'clamp(1.25rem, 1.25rem + 1vw, 1.5rem)',
        'fluid-2xl': 'clamp(1.5rem, 1.5rem + 1.5vw, 2rem)',
        'fluid-3xl': 'clamp(1.875rem, 1.875rem + 2vw, 2.5rem)',
        'fluid-4xl': 'clamp(2.25rem, 2.25rem + 2.5vw, 3rem)',
      },
    },
  },
  plugins: [],
}
