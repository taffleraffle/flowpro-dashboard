import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#061B30',
          800: '#0A2540',
          700: '#0D3556',
          600: '#134268',
          500: '#1E5380',
          100: '#DCE6EE',
        },
        cyan: {
          700: '#0F8CB8',
          600: '#1BA8D4',
          500: '#2BBDE6',
          300: '#7DD3E8',
          100: '#C8EAF3',
          50:  '#E8F4F9',
        },
        ink: '#0A2540',
        'ink-2': '#2C3E50',
        muted: '#6B7A88',
        'muted-2': '#93A1AE',
        bg: '#F5F8FA',
        surface: '#FFFFFF',
        'surface-2': '#FAFBFC',
        border: '#E1E7ED',
        'border-2': '#D0D9E1',
        divider: '#ECF0F3',
        success: '#15A36A',
        'success-bg': '#E5F4EC',
        warn: '#E8A93C',
        'warn-bg': '#FBF1DC',
        danger: '#D14543',
        'danger-bg': '#FBE6E5',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
      },
      boxShadow: {
        'sm-1': '0 1px 2px rgba(10,37,64,.04), 0 1px 1px rgba(10,37,64,.03)',
        'md-1': '0 1px 3px rgba(10,37,64,.06), 0 4px 12px rgba(10,37,64,.04)',
        'lg-1': '0 4px 16px rgba(10,37,64,.08), 0 16px 40px rgba(10,37,64,.06)',
      },
    },
  },
  plugins: [],
};
export default config;
