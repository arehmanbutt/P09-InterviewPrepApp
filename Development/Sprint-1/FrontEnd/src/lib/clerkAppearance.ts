// src/lib/clerkAppearance.ts
// TypeScript-friendly Clerk appearance object.
// We export it as a plain object; when passing to Clerk components we cast locally to avoid
// depending on Clerk's internal theme types (which may not be exported in all SDK versions).

const clerkAppearance = {
  baseTheme: ['dark'], // use array to be resilient across Clerk versions
  layout: {
    logoPlacement: 'insideCard',
    logoImageUrl: '', // optional: set '/logo.png' if you have a logo in public/
  },
  variables: {
    // primary colors and surfaces
    colorPrimary: '#3ecf8e',
    colorText: '#e6eef1',
    colorBackground: '#0b0b0b',
    colorDanger: '#ef4444',
    colorSurface: 'rgba(255,255,255,0.03)',
    colorMuted: '#94a3b8',

    // spacing, radius, fonts
    spacingUnit: '8px',
    borderRadius: '0.5rem',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue"',
    fontSizeBase: '16px',

    // controls
    controlHeight: '44px',
    controlBorderRadius: '8px',
  },
  styles: {
    // Minimal overrides for Clerk internal classes so the widget matches your Tailwind theme.
    '.cl-auth-card': {
      background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06))',
      border: '1px solid rgba(255,255,255,0.04)',
      boxShadow: 'none',
    },
    '.cl-card-root': {
      background: 'transparent',
    },
    '.cl-form': {
      gap: '0.5rem',
    },
    '.cl-input': {
      background: 'rgba(0,0,0,0.2)',
      color: '#e6eef1',
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      border: 'none',
    },
    '.cl-input:focus': {
      outline: '2px solid rgba(62,207,142,0.25)',
    },
    '.cl-button': {
      background: '#3ecf8e',
      color: '#000',
      padding: '0.6rem 1rem',
      borderRadius: '0.5rem',
      fontWeight: 600,
    },
    '.cl-primary-action': {
      background: '#3ecf8e',
      color: '#000',
    },
    '.cl-link': {
      color: '#3ecf8e',
    },
    '.cl-error': {
      color: '#ff7b7b',
    },
  },
} as const

export default clerkAppearance
