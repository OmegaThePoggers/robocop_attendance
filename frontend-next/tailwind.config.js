/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class', // We will force this via a wrapper class or rely on the globals.css dark mode media query
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                surface: "var(--surface)",
                surfaceHover: "var(--surface-hover)",
                border: "var(--border)",
                textMain: "var(--text-main)",
                textMuted: "var(--text-muted)",
                accent: "var(--accent)",
                accentHover: "var(--accent-hover)",
                danger: "var(--danger)",
                dangerHover: "var(--danger-hover)",
                success: "var(--success)",
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
                mono: ['var(--font-roboto-mono)', 'monospace'],
            },
            boxShadow: {
                // Minimal shadows, mostly flat design
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
            },
            borderRadius: {
                'sm': '2px',
                DEFAULT: '4px',
                'md': '6px',
                'lg': '8px',
            }
        },
    },
    plugins: [],
};
