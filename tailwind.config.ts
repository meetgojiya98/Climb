import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Brand colors
        climb: {
          DEFAULT: 'hsl(148 86% 47%)',
          foreground: '#fff',
          secondary: 'hsl(188 93% 46%)',
        },
        navy: {
          50: '#f2f6ff',
          100: '#e4ecfb',
          200: '#c9d8f5',
          300: '#9db8eb',
          400: '#7194db',
          500: '#4f73c4',
          600: '#3f5ca0',
          700: '#354a80',
          800: '#2d3d68',
          900: '#243353',
          950: '#121827',
        },
        saffron: {
          50: '#effff4',
          100: '#d8ffe6',
          200: '#b3ffd0',
          300: '#79fdb0',
          400: '#3cec8a',
          500: '#19d56d',
          600: '#0dad57',
          700: '#0f8948',
          800: '#136d3d',
          900: '#125a35',
        },
        gold: {
          50: '#edfcff',
          100: '#d4f7ff',
          200: '#adefff',
          300: '#74e3ff',
          400: '#34d3ff',
          500: '#08b8f0',
          600: '#0792c4',
          700: '#0e749d',
          800: '#145f80',
          900: '#154f69',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        display: ['var(--font-grotesk)', 'var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 22px hsla(148, 86%, 47%, 0.28)',
        'glow-md': '0 0 38px hsla(148, 86%, 47%, 0.34)',
        'glow-lg': '0 0 52px hsla(188, 93%, 46%, 0.36)',
        'navy-glow': '0 0 44px hsla(221, 43%, 51%, 0.3)',
        'premium': '0 14px 30px -18px rgb(18 24 39 / 0.34), 0 5px 12px -8px rgb(18 24 39 / 0.2)',
        'premium-md': '0 22px 48px -24px rgb(18 24 39 / 0.42), 0 8px 20px -12px rgb(18 24 39 / 0.25)',
        'premium-lg': '0 30px 68px -30px rgb(18 24 39 / 0.5), 0 14px 30px -20px rgb(18 24 39 / 0.36)',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 22px hsla(148, 86%, 47%, 0.34)' },
          '50%': { boxShadow: '0 0 44px hsla(188, 93%, 46%, 0.45)' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg) translateX(150px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(150px) rotate(-360deg)' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.4s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'orbit': 'orbit 20s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
