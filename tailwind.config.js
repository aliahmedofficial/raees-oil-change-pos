const invoiceAccent = {
  50: 'rgb(var(--raees-gold-light-rgb) / <alpha-value>)',
  100: 'rgb(var(--raees-paper-rgb) / <alpha-value>)',
  200: 'rgb(var(--raees-gold-light-rgb) / <alpha-value>)',
  300: 'rgb(var(--raees-gold-rgb) / <alpha-value>)',
  400: 'rgb(var(--raees-bronze-rgb) / <alpha-value>)',
  500: 'rgb(var(--raees-bronze-rgb) / <alpha-value>)',
  600: 'rgb(var(--raees-ink-rgb) / <alpha-value>)',
  700: 'rgb(var(--raees-text-rgb) / <alpha-value>)',
  800: 'rgb(var(--raees-text-rgb) / <alpha-value>)',
  900: 'rgb(var(--raees-ink-rgb) / <alpha-value>)',
  950: 'rgb(var(--raees-text-rgb) / <alpha-value>)',
};

const invoiceNeutral = {
  50: 'rgb(var(--raees-paper-rgb) / <alpha-value>)',
  100: 'rgb(var(--raees-gold-light-rgb) / <alpha-value>)',
  200: 'rgb(var(--raees-line-rgb) / <alpha-value>)',
  300: 'rgb(var(--raees-line-rgb) / <alpha-value>)',
  400: 'rgb(var(--raees-line-rgb) / <alpha-value>)',
  500: 'rgb(var(--raees-line-rgb) / <alpha-value>)',
  600: 'rgb(var(--raees-line-rgb) / <alpha-value>)',
  700: 'rgb(var(--raees-text-rgb) / <alpha-value>)',
  800: 'rgb(var(--raees-text-rgb) / <alpha-value>)',
  900: 'rgb(var(--raees-text-rgb) / <alpha-value>)',
  950: 'rgb(var(--raees-ink-rgb) / <alpha-value>)',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: invoiceAccent,
        blue: invoiceAccent,
        cyan: invoiceAccent,
        emerald: invoiceAccent,
        green: invoiceAccent,
        indigo: invoiceAccent,
        lime: invoiceAccent,
        orange: invoiceAccent,
        pink: invoiceAccent,
        purple: invoiceAccent,
        red: invoiceAccent,
        rose: invoiceAccent,
        teal: invoiceAccent,
        yellow: invoiceAccent,
        gray: invoiceNeutral,
        slate: invoiceNeutral,
        stone: invoiceNeutral,
        black: 'rgb(var(--raees-ink-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
