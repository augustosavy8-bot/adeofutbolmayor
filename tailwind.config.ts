import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        adeo: {
          rojo: '#d5202f',
          'rojo-claro': '#ef3b49',
          'rojo-oscuro': '#a5161f',
        },
        panel: {
          950: '#0b0b0d',
          900: '#121215',
          850: '#17171b',
          800: '#1d1d22',
          700: '#2a2a31',
          600: '#3a3a43',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6)',
      },
    },
  },
  plugins: [],
};

export default config;
