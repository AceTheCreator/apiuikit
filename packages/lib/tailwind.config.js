const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../x-tensions/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '10rem',
        sm: '2rem',
        lg: '10rem',
        xl: '10rem',
        '2xl': '10rem',
      },
    },
    extend: {
      // Matches Tailwind's default screen breakpoints (sm/md/lg/xl), so @sm/@md/@lg/@xl
      // container queries switch at the same widths the old sm:/md:/lg: viewport
      // breakpoints used, just measured against the widget's own container instead
      // of the browser viewport.
      containers: {
        sm: '40rem',
        md: '48rem',
        lg: '64rem',
        xl: '80rem',
      },
      colors: {
        rose: colors.rose[500],
        gray: colors.slate,
        cyan: colors.cyan,
        'code-block': 'rgb(37, 47, 63)',
        'code-block2': 'rgb(57, 67, 83)',
        'code-block-highlight': colors.cyan[300],
        primary: {
          50:  'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
        },
        secondary: {
          50:  'rgb(var(--color-secondary-50) / <alpha-value>)',
          100: 'rgb(var(--color-secondary-100) / <alpha-value>)',
          200: 'rgb(var(--color-secondary-200) / <alpha-value>)',
          300: 'rgb(var(--color-secondary-300) / <alpha-value>)',
          500: 'rgb(var(--color-secondary-500) / <alpha-value>)',
          600: 'rgb(var(--color-secondary-600) / <alpha-value>)',
          700: 'rgb(var(--color-secondary-700) / <alpha-value>)',
        },
        neutral: {
          50:  'rgb(var(--color-neutral-50) / <alpha-value>)',
          100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
          200: 'rgb(var(--color-neutral-200) / <alpha-value>)',
          300: 'rgb(var(--color-neutral-300) / <alpha-value>)',
          500: 'rgb(var(--color-neutral-500) / <alpha-value>)',
          600: 'rgb(var(--color-neutral-600) / <alpha-value>)',
          700: 'rgb(var(--color-neutral-700) / <alpha-value>)',
          800: 'rgb(var(--color-neutral-800) / <alpha-value>)',
          900: 'rgb(var(--color-neutral-900) / <alpha-value>)',
        },
        // Semantic tokens — these are what dark mode overrides
        background:           'rgb(var(--color-background) / <alpha-value>)',
        surface:              'rgb(var(--color-surface) / <alpha-value>)',
        border:               'rgb(var(--color-border) / <alpha-value>)',
        foreground:           'rgb(var(--color-text-primary) / <alpha-value>)',
        'foreground-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'foreground-muted':   'rgb(var(--color-text-muted) / <alpha-value>)',
      },
      maxWidth: {
        '9xl': '98rem'
      },
      width: {
        prose: '70ch',
        mprose: '75ch',
        '144': '36rem',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            pre: {
             backgroundColor: '#011627'
            },
          },
        },
      })
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
