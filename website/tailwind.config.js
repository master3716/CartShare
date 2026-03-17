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
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-up-fast': 'fadeInUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.35s ease-out',
        'slide-in-left': 'slideInLeft 0.35s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 2s',
        'float-slow': 'float 8s ease-in-out infinite 1s',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'gradient-x': 'gradientX 4s ease infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'stagger-1': 'fadeInUp 0.5s ease-out 0.1s both',
        'stagger-2': 'fadeInUp 0.5s ease-out 0.2s both',
        'stagger-3': 'fadeInUp 0.5s ease-out 0.3s both',
        'stagger-4': 'fadeInUp 0.5s ease-out 0.4s both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(124, 92, 246, 0)' },
          '50%': { boxShadow: '0 0 20px 8px rgba(124, 92, 246, 0.3)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shrink: {
          '0%': { transform: 'scaleX(1)' },
          '100%': { transform: 'scaleX(0)' },
        },
      },
      backgroundSize: {
        '200%': '200% 200%',
      },
    },
  },
  plugins: [],
}
