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
          DEFAULT: 'hsl(345 100% 65%)',
          foreground: '#fff',
          secondary: 'hsl(193 83% 47%)',
        },
        navy: {
          50: '#eef4ff',
          100: '#dfe9ff',
          200: '#c4d8ff',
          300: '#97bcff',
          400: '#6d96ff',
          500: '#4b72f5',
          600: '#3758d8',
          700: '#2c45ad',
          800: '#233782',
          900: '#1f3069',
          950: '#11183a',
        },
        saffron: {
          50: '#fff3f3',
          100: '#ffe3e4',
          200: '#ffc8cb',
          300: '#ffa3a9',
          400: '#ff6f7c',
          500: '#ff4d67',
          600: '#e43356',
          700: '#bf2748',
          800: '#9e2540',
          900: '#84253b',
        },
        gold: {
          50: '#edfdff',
          100: '#ccf8ff',
          200: '#9af0ff',
          300: '#64e1ff',
          400: '#2fc7f4',
          500: '#14acd9',
          600: '#0f89af',
          700: '#116f8d',
          800: '#155b73',
          900: '#164c61',
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
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 20px hsla(345, 100%, 65%, 0.25)',
        'glow-md': '0 0 34px hsla(345, 100%, 65%, 0.32)',
        'glow-lg': '0 0 48px hsla(193, 83%, 47%, 0.35)',
        'navy-glow': '0 0 42px hsla(226, 54%, 44%, 0.32)',
        'premium': '0 12px 30px -18px rgb(17 24 58 / 0.26), 0 4px 10px -6px rgb(17 24 58 / 0.12)',
        'premium-md': '0 20px 44px -24px rgb(17 24 58 / 0.35), 0 6px 16px -8px rgb(17 24 58 / 0.2)',
        'premium-lg': '0 28px 62px -28px rgb(17 24 58 / 0.42), 0 14px 28px -16px rgb(17 24 58 / 0.32)',
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
          '0%, 100%': { boxShadow: '0 0 20px hsla(38, 100%, 50%, 0.3)' },
          '50%': { boxShadow: '0 0 40px hsla(38, 100%, 50%, 0.5)' },
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
