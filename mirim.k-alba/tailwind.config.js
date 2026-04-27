/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        n9:  '#0A1628',
        n7:  '#1B365D',
        ink: '#0A1628',
        ink2: '#3F5273',
        ink3: '#6B7A95',
        p:   '#FFFFFF',
        p2:  '#F7F5F0',
        r:   '#D9D4C7',
        g:   '#B8944A',
        gl:  '#E8D9B5',
        ac:  '#C2512A',
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'BlinkMacSystemFont',
               'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
