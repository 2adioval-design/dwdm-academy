/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: { 1:'#07090f', 2:'#0d1117', 3:'#0f1629', 4:'#151d3a' },
        cy: { 4:'#00d4ff', 5:'#00b8d9', 6:'#0097b2' },
        vi: { 4:'#a78bfa', 5:'#7c3aed' },
        em: { 4:'#34d399', 5:'#10b981' },
        am: { 4:'#fbbf24', 5:'#f59e0b' },
        rd: { 4:'#f87171', 5:'#ef4444' },
        tx: { 1:'#e2e8f0', 2:'#94a3b8', 3:'#64748b' }
      }
    }
  },
  plugins: []
}
