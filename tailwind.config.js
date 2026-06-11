/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background scale
        'bg-deep':         '#0D0620',
        'bg-mid':          '#130830',
        'bg-card':         '#1C0E42',
        'bg-raised':       '#24145A',
        'bg-border':       '#2E1A70',
        // Brand
        'fl-purple':       '#7F77DD',
        'fl-purple-light': '#ADA7F0',
        'fl-purple-dim':   '#4A4399',
        'fl-gold':         '#FFD700',
        'fl-gold-dim':     '#C8A800',
        'fl-white':        '#EDE8FF',
        'fl-muted':        '#6B5C99',
        'fl-muted2':       '#40306A',
        'fl-danger':       '#E05050',
        // Path colours
        'path-red':        '#E24B4A',
        'path-blue':       '#378ADD',
        'path-green':      '#639922',
        'path-yellow':     '#EF9F27',
        'path-purple':     '#7F77DD',
        'path-orange':     '#D85A30',
        'path-teal':       '#1D9E75',
        'path-pink':       '#D4537E',
      },
      fontFamily: {
        display: ["'Space Mono'", 'monospace'],
        body:    ["'DM Sans'",    'sans-serif'],
      },
      borderRadius: {
        'cell':  '3px',
        'btn':   '8px',
        'card':  '10px',
        'modal': '20px',
      },
    },
  },
  plugins: [],
}
