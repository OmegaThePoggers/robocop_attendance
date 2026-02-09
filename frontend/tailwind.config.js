/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#020617', // Slate 950 - Deepest void
        surface: '#0f172a',    // Slate 900 - Panel background
        primary: '#00f0ff',    // Neon Cyan - Main accents
        secondary: '#bd00ff',  // Neon Purple - Secondary accents
        alert: '#ff003c',      // Cyber Red - Errors/Alerts
        success: '#00ff9f',    // Cyber Green - Success
        warning: '#fcee0a',    // Cyber Yellow - Warning
        muted: '#64748b',      // Slate 500 - Muted text
      },
      fontFamily: {
        sans: ['Rajdhani', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'neon-blue': '0 0 5px theme("colors.primary"), 0 0 20px theme("colors.primary")',
        'neon-purple': '0 0 5px theme("colors.secondary"), 0 0 20px theme("colors.secondary")',
        'neon-red': '0 0 5px theme("colors.alert"), 0 0 20px theme("colors.alert")',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}

