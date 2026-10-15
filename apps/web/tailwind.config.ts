import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cit: {
          dark: '#07090e',
          card: '#0f1420',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#9d174d', // Vibrant magenta accent from legacy CIT
          glow: '#ec4899',
          cyan: '#06b6d4',
          gold: '#f59e0b',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
