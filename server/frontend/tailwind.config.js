/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui")
  ],
  daisyui: {
    themes: [
      {
        "mytheme": {
          "primary": "#89b855",
          "secondary": "#736d82",
          "accent": "#a0a851",
          "neutral": "#5a94d3",
          "base-100": "#d8dfe6",
          "info": "#fff",
          "success": "#84cc16",
          "warning": "#94948c",
          "error": "#662e68",
        },
      }
    ]
  }
}

