/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#F7F8F3",
        sage: "#DCEEE2",
        "mint-50": "#EFF8F2",
        "mint-100": "#E2F1E7",
        "misty-blue": "#E2EEF2",
        lavender: "#EEE8F5",
        "deep-sage": "#477C69",
        "dark-teal": "#123B3B",
      },
      fontFamily: {
        serif: ["'DM Serif Display'", "serif"],
        sans: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
