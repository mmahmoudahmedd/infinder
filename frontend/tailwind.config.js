/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        infinder: {
          lime: '#BEF35E',
          green: '#76D74F',
          black: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow:              '0 0 24px rgba(190, 243, 94, 0.35)',
        'glow-lime':       '0 0 24px rgba(190, 243, 94, 0.35)',
        'glow-lime-hover': '0 0 60px rgba(190, 243, 94, 0.50)',
        'glow-lime-sm':    '0 0 20px rgba(190, 243, 94, 0.40)',
      },
    },
  },
  plugins: [],
};
