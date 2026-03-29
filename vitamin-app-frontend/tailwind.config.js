// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAFA',       // Premium Off-White background
        surface: '#FFFFFF',  // Pure White Cards
        text: '#18181b',     // High Contrast Black
        textLight: '#71717a', // Subtle Grey
        primary: '#F97316',  // Vitamin Orange (from Logo)
        accent: '#3B82F6',   // Vitamin Blue (from Logo)
        border: '#E4E4E7',   // Ultra-thin borders
      }
    },
  },
  plugins: [],
}