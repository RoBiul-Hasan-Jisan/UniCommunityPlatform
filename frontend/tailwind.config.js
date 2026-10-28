/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Source Serif 4", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#12192B",
          50: "#F1F2F5",
          100: "#DEE1E8",
          200: "#B7BCCB",
          300: "#8A91A8",
          400: "#5E6683",
          500: "#3B4361",
          600: "#262E4A",
          700: "#1A2138",
          800: "#12192B",
          900: "#0B0F1C",
        },
        paper: {
          DEFAULT: "#F7F5EF",
          dim: "#EFEBE0",
        },
        brass: {
          50: "#FBF4E4",
          100: "#F3E3B8",
          200: "#E6C87C",
          300: "#D5AD52",
          400: "#C0973A",
          500: "#AB812E",
          600: "#8C6822",
          700: "#6E501A",
        },
        crimson: {
          50: "#F7E9EA",
          100: "#EAC6C9",
          400: "#A5414C",
          500: "#8C2F39",
          600: "#6E2029",
        },
        // Override default gray scale with a warm, ink-tinted neutral so every
        // existing text-gray-*/bg-gray-* utility inherits the new identity.
        gray: {
          50: "#F7F5EF",
          100: "#EEEAE0",
          200: "#E1DCCC",
          300: "#C8C2AE",
          400: "#9C9784",
          500: "#78735F",
          600: "#5B5747",
          700: "#433F34",
          800: "#2E2B24",
          900: "#1D1B16",
        },
        // brand kept for backwards compatibility with existing className strings;
        // remapped to the brass accent so bg-brand-500 etc. read as the new identity.
        brand: {
          50: "#FBF4E4",
          100: "#F3E3B8",
          500: "#AB812E",
          600: "#8C6822",
          700: "#6E501A",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(18, 25, 43, 0.04)",
        lift: "0 8px 24px rgba(18, 25, 43, 0.10)",
      },
    },
  },
  plugins: [],
};
