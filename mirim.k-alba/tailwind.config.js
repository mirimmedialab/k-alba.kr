/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: "#FF6B5A",
        coralL: "#FFF0EE",
        mint: "#0BD8A2",
        mintL: "#E8FFF7",
        navy: "#1A1F3D",
        navyL: "#2D3461",
      },
      fontFamily: {
        sans: ["Noto Sans KR", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
