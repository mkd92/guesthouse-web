/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      }
    }
  },
  plugins: [
    // Add viewport-fit=cover support for iPhone notch
    function ({ addUtilities }) {
      addUtilities({
        '.pt-safe-top': { paddingTop: 'env(safe-area-inset-top, 0px)' },
        '.pb-safe-bottom': { paddingBottom: 'env(safe-area-inset-bottom, 0px)' },
        '.snap-x': { 'scroll-snap-type': 'x mandatory' },
        '.snap-mandatory': { 'scroll-snap-type': 'x mandatory' },
        '.snap-start': { 'scroll-snap-align': 'start' },
      });
    }
  ]
};
