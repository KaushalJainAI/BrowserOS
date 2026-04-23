/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ubuntu: {
          orange: 'var(--os-accent)', /* Remapped to OS Accent for backward compatibility with old classes */
        },
        os: {
          accent: 'var(--os-accent)',
          hover: 'var(--os-accent-hover)',
          dock: 'var(--os-dock)',
          panel: 'var(--os-panel)',
        }
      }
    },
  },
  plugins: [],
}
