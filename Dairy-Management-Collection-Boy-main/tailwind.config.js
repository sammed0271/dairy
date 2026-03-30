// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  darkMode:"class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2A9D8F",
        primaryDark: "#247B71",
        accentOrange: "#F4A261",
        accentRed: "#E76F51",
        accentBlue: "#457B9D",
        background: "#F8F4E3",
        surface: "#FFFFFF",
        textMain: "#5E503F",
        borderSoft: "#E9E2C8",
      },
    },
  },
  plugins: [],
};