/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FFE66C",
        secondary: "#A9C8FF",
        tertiary: "#B7FF76",
        neutral: "#000000",
        background: "#FFE66C",
        surface: "#000000",
        'text-primary': "#131313",
        'text-secondary': "#FFFFFF",
        border: "#131313",
        accent: "#FFE66C",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      spacing: {
        base: "4px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        gap: "12px",
        'card-padding': "24px",
        'section-padding': "24px",
      },
      borderRadius: {
        card: "30px",
        '3xl': "30px",
      },
      boxShadow: {
        premium: "rgba(169, 200, 255, 0.3) 0px 25px 50px 0px",
      },
      transitionDuration: {
        150: "150ms",
        700: "700ms",
        500: "500ms",
      }
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
