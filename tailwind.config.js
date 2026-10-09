/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1F44",
          50: "#EEF2F9",
          100: "#D5DEEE",
          700: "#14306A",
          800: "#0F2552",
          900: "#0B1F44",
        },
        turquoise: {
          DEFAULT: "#14B8A6",
          50: "#E6FAF7",
          100: "#C3F2EA",
          600: "#0D9488",
          700: "#0F766E",
        },
        coral: {
          DEFAULT: "#F26B3A",
          50: "#FEF0EA",
          100: "#FDDCCD",
          600: "#E0551F",
        },
        surface: "#F4F6FA",
        ink: {
          DEFAULT: "#111827",
          muted: "#6B7280",
          soft: "#9CA3AF",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
