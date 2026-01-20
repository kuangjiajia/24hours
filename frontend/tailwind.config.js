/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bone: '#FDFBF7',
        void: '#0F0F0F',
        'genz-yellow': '#FFD550',
        'light-gray': '#E6E6E6',
        'surface-dark': '#1A1A1A',
      },
      fontFamily: {
        display: ['Rubik Mono One', 'monospace'],
        heading: ['Anton', 'sans-serif'],
        body: ['DM Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        bento: '32px',
      },
      animation: {
        'marquee': 'marquee 20s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
