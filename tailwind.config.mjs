/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./src/**/*.{astro,html,js,jsx,ts,tsx,vue,md,mdx}",
      "./public/**/*.html"
    ],
    theme: {
      extend: {},
    },
    plugins: [require("daisyui")],
    daisyui: {
      themes: [
        {
          lunettes: {
            "primary": "#2C3E50",
            "secondary": "#8B7355",
            "accent": "#C9A885",
            "neutral": "#2b2b2b",
            "base-100": "#F5F5F0",
            "base-200": "#EDEBE6",
            "base-300": "#E1DFDA",
            "info": "#3ABFF8",
            "success": "#22C55E",
            "warning": "#F59E0B",
            "error": "#EF4444"
          }
        }
      ],
      darkTheme: "lunettes",
    },
  };
  