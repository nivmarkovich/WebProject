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
        rubik: ['var(--font-rubik)', 'Segoe UI', 'Tahoma', 'sans-serif'],
        heebo: ['var(--font-heebo)', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      colors: {
        'emergency': '#ef4444',
        'emergency-glow': '#dc2626',
        'lora': '#06b6d4',
        'lora-glow': '#0891b2',
        'success': '#10b981',
        'warning': '#f59e0b',
        'surface': '#0f172a',
        'surface-light': '#1e293b',
        'surface-lighter': '#334155',
        'glass': 'rgba(15, 23, 42, 0.8)',
        'glass-border': 'rgba(148, 163, 184, 0.1)',
      },
    },
  },
  plugins: [],
};
export default config;
