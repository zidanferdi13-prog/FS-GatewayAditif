import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Mapped to CSS custom properties for theme switching
        'bg-base':     'var(--bg-base)',
        'bg-surface':  'var(--bg-surface)',
        'bg-card':     'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',

        'c-blue':        'var(--c-blue)',
        'c-blue-bright': 'var(--c-blue-bright)',
        'c-blue-dim':    'var(--c-blue-dim)',
        'c-warning':     'var(--c-warning)',
        'c-purple':      'var(--c-purple)',
        'c-purple-dim':  'var(--c-purple-dim)',
        'c-green':       'var(--c-green)',
        'c-green-dim':   'var(--c-green-dim)',
        'c-red':         'var(--c-red)',
        'c-red-dim':     'var(--c-red-dim)',
        'c-amber':       'var(--c-amber)',
        'c-amber-dim':   'var(--c-amber-dim)',

        't-primary':   'var(--t-primary)',
        't-secondary': 'var(--t-secondary)',
        't-muted':     'var(--t-muted)',

        'b-subtle': 'var(--b-subtle)',
        'b-card':   'var(--b-card)',
      },
      fontFamily: {
        ui:  ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'sm':   '6px',
        'md':   '10px',
        'lg':   '16px',
        'xl':   '22px',
        'xxl':  '50px',
        'pill': '999px',
      },
      animation: {
        'pulse-slow':    'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-alarm':   'flash-alarm 0.5s ease-in-out infinite alternate',
        'slide-up':      'slide-up 0.3s ease-out',
        'fade-in':       'fade-in 0.2s ease-out',
        'scale-in':      'scale-in 0.2s ease-out',
        'glow-pulse':    'glow-pulse 2s ease-in-out infinite',
        'count-tick':    'count-tick 0.2s ease-out',
      },
      keyframes: {
        'flash-alarm': {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0.3' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1'   },
        },
        'count-tick': {
          '0%':   { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      boxShadow: {
        'glow-blue':   '0 0 50px var(--c-blue-glow)',
        'glow-purple': '0 0 50px var(--c-purple-glow)',
        'glow-green':  '0 0 20px var(--c-green-glow)',
        'glow-red':    '0 0 20px var(--c-red-glow)',
        'glow-amber':  '0 0 20px var(--c-amber-glow)',
        'inner-blue':  'inset 0 0 60px rgba(59,130,246,.04)',
        'inner-purple':'inset 0 0 60px rgba(139,92,246,.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
