/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        robocop: {
          900: '#0f172a', // Deep slate
          800: '#1e293b',
          700: '#334155',
          500: '#0ea5e9', // Cyber blue
          400: '#38bdf8',
          glow: '#00f7ff', // Neon cyan
        }
      }
    },
  },
  plugins: [],
}

