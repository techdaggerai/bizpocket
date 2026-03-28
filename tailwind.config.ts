import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          hover: 'var(--accent-hover)',
        },
        surface: {
          DEFAULT: 'var(--bg)',
          2: 'var(--bg-2)',
          3: 'var(--bg-3)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        txt: {
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
          4: 'var(--text-4)',
        },
        card: {
          bg: 'var(--card-bg)',
          border: 'var(--card-border)',
        },
        money: {
          green: 'var(--green)',
          red: 'var(--red)',
          'green-bg': 'var(--green-bg)',
          'red-bg': 'var(--red-bg)',
        },
      },
      borderRadius: {
        input: '8px',
        btn: '10px',
        card: '14px',
        'card-lg': '16px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0,0,0,0.06)',
        'md': '0 4px 16px rgba(0,0,0,0.07)',
        'lg': '0 20px 60px rgba(0,0,0,0.08)',
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '1.6' }],
        'sm': ['13px', { lineHeight: '1.6' }],
        'base': ['14px', { lineHeight: '1.6' }],
        'md': ['16px', { lineHeight: '1.6' }],
        'lg': ['18px', { lineHeight: '1.5' }],
        'xl': ['24px', { lineHeight: '1.3' }],
        '2xl': ['32px', { lineHeight: '1.2' }],
        '3xl': ['42px', { lineHeight: '1.1' }],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
