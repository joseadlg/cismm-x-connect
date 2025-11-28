/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "!./node_modules/**"
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#0D2A4C',
        'brand-secondary': '#1A535C',
        'brand-accent': '#007AFF',
        'brand-light': '#FFFFFF',
        'brand-danger': '#FF6B6B',
        'glass-surface': 'rgba(255, 255, 255, 0.4)',
        'glass-border': 'rgba(255, 255, 255, 0.8)',
        'neon-blue': '#00f3ff',
        'neon-purple': '#bd00ff',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'neon': '0 0 10px rgba(0, 243, 255, 0.5), 0 0 20px rgba(189, 0, 255, 0.3)',
      },
    },
  },
  plugins: [],
}
