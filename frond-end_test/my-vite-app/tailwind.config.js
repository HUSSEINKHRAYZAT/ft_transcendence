/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {      
      colors: {
        'pastel-purple-100': '#E6E6FA',
        'pastel-purple-200': '#D8BFD8',
        'pastel-purple-700': '#6A5ACD',
        'pastel-pink-100': '#FFD1DC',
        'pastel-pink-200': '#FFB6C1',
        'pastel-pink-300': '#FF69B4',
      },
      fontFamily: {
      roboto: ['Roboto', 'sans-serif'],
      poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
