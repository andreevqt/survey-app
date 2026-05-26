import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: 'var(--indigo-50)',
          100: 'var(--indigo-100)',
          300: 'var(--indigo-300)',
          400: 'var(--indigo-400)',
          500: 'var(--indigo-500)',
          600: 'var(--indigo-600)',
          700: 'var(--indigo-700)',
        },
        gray: {
          50: 'var(--gray-50)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
        },
        red: {
          50: 'var(--red-50)',
          100: 'var(--red-100)',
          200: 'var(--red-200)',
          600: 'var(--red-600)',
          700: 'var(--red-700)',
        },
        green: {
          50: 'var(--green-50)',
          100: 'var(--green-100)',
          600: 'var(--green-600)',
          700: 'var(--green-700)',
        },
        blue: {
          100: 'var(--blue-100)',
          700: 'var(--blue-700)',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        xl: 'var(--shadow-xl)',
      },
    },
  },
  plugins: [],
};
export default config;
