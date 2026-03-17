/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f1ff',
          100: '#ebe8ff',
          200: '#d9d3ff',
          300: '#bdb3fe',
          400: '#9c89fc',
          500: '#7c5cf6',
          600: '#6d3ef0',
          700: '#5e2dd3',
          800: '#4e25af',
          900: '#421f8f',
          950: '#270f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

