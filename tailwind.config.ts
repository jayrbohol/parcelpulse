import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0C1117',
        card: '#111827',
        primary: '#1F6FEB',
        accent: '#1E293B',
      },
      borderRadius: {
        xl: '14px',
      },
    },
  },
  plugins: [],
} satisfies Config
