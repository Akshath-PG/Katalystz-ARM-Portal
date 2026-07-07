import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: '#fff3ee',
          100: '#ffdfd1',
          400: '#FFA180', // primary-light
          500: '#FF6B35', // primary
          600: '#E85A2A', // primary-dark
          900: '#7a2909',
        }
      },
    },
  },
  plugins: [],
};
export default config;
