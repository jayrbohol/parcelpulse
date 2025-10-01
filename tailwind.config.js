/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0C1117',
        card: '#0F172A',
        primary: '#1F6FEB',
      },
      borderRadius: {
        xl: '14px',
      },
    },
  },
  plugins: [],
}
