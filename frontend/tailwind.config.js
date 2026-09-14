/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#12151B",
          surface: "#1B1F27",
          surface2: "#242933",
          border: "#2C313D",
        },
        ring: {
          water: "#33C5FF",
          food: "#FF6B4A",
          sleep: "#9B8CFF",
          exercise: "#B4FF3D",
        },
        ink: {
          primary: "#F5F7FA",
          secondary: "#8A93A3",
          muted: "#5B6272",
        },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
