/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
	theme: { extend: {} },
	plugins: [require("daisyui")],
	daisyui: {
	  themes: [
		{
		  lunettes: {
			// Palette issue de ton brandboard (proche)
			"primary": "#2C3E50",      // Bleu nuit
			"secondary": "#8B7355",    // Terre d’ombre
			"accent": "#C9A885",       // Beige doré
			"neutral": "#2b2b2b",
			"base-100": "#F5F5F0",     // Blanc cassé (fond)
			"base-200": "#EDEBE6",
			"base-300": "#E1DFDA",
			"info": "#3ABFF8",
			"success": "#22C55E",
			"warning": "#F59E0B",
			"error": "#EF4444"
		  }
		}
	  ],
	  darkTheme: "lunettes"
	}
  };
  