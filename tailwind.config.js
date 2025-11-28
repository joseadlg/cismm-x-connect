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
        'brand-accent': '#4ECDC4',
        'brand-light': '#FFFFFF',
        'brand-danger': '#FF6B6B',
      },
    },
  },
  plugins: [],
}
