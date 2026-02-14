import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        climb: {
          DEFAULT: "hsl(36 94% 54%)",
          foreground: "#fff",
          secondary: "hsl(186 93% 43%)",
        },
        navy: {
          50: "#f2f6ff",
          100: "#e4ebff",
          200: "#ccd9ff",
          300: "#a9bcf9",
          400: "#7f9ae9",
          500: "#617ed0",
          600: "#4d63ac",
          700: "#404f8b",
          800: "#33416f",
          900: "#2a3458",
          950: "#161c34",
        },
        saffron: {
          50: "#fff8eb",
          100: "#ffedc7",
          200: "#ffda89",
          300: "#ffc757",
          400: "#ffb22e",
          500: "#ff9b13",
          600: "#e0780a",
          700: "#b8550c",
          800: "#954113",
          900: "#7a3714",
        },
        gold: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "26px",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-grotesk)", "var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-sm": "0 0 24px hsla(36, 94%, 54%, 0.3)",
        "glow-md": "0 0 40px hsla(36, 94%, 54%, 0.34)",
        "glow-lg": "0 0 54px hsla(186, 93%, 43%, 0.36)",
        "navy-glow": "0 0 44px hsla(223, 53%, 57%, 0.3)",
        premium: "0 14px 30px -18px rgb(10 18 33 / 0.36), 0 5px 12px -8px rgb(10 18 33 / 0.24)",
        "premium-md": "0 22px 48px -24px rgb(10 18 33 / 0.44), 0 8px 20px -12px rgb(10 18 33 / 0.28)",
        "premium-lg": "0 30px 68px -30px rgb(10 18 33 / 0.52), 0 14px 30px -20px rgb(10 18 33 / 0.38)",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 24px hsla(36, 94%, 54%, 0.34)" },
          "50%": { boxShadow: "0 0 46px hsla(186, 93%, 43%, 0.44)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(150px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(150px) rotate(-360deg)" },
        },
      },
      animation: {
        "gradient-shift": "gradient-shift 15s ease infinite",
        float: "float 6s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.4s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        orbit: "orbit 20s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
