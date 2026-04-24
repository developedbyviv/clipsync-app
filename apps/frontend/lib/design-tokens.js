/**
 * ClipSync Design Tokens
 * Documentation reference — actual tokens are configured in tailwind.config.ts
 */
export const tokens = {
  colors: {
    olive: {
      50:  '#F7F6ED', 100: '#ECEACC', 200: '#D6D49A', 300: '#BEBB6A',
      400: '#A3A047', 500: '#85823A', 600: '#6B6930', 700: '#524F24',
      800: '#38361A', 900: '#1E1D0D',
    },
    stone: {
      50:  '#FAFAF9', 100: '#F5F5F0', 200: '#E8E8E0', 300: '#D4D4C8',
      400: '#A8A89A', 500: '#78786C', 600: '#5C5C52', 700: '#404038',
      800: '#282820', 900: '#141410',
    },
    semantic: {
      amberWarm: '#C4862A',
      success:   '#5A7A3A',
      error:     '#A63228',
      warning:   '#B07820',
      info:      '#3A6B7A',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    weights: { regular: 400, medium: 500, semibold: 600 },
    // Max weight: 600 — 700 is too heavy for this minimal style
  },
  spacing: {
    pagePaddingMobile:  'px-4',
    pagePaddingTablet:  'px-6',
    pagePaddingDesktop: 'px-8',
    sectionGap:         'gap-8',
    cardPadding:        'p-6',
    maxWidthPage:       'max-w-content', // 672px
    maxWidthDashboard:  'max-w-dashboard', // 1024px
  },
  borderRadius: {
    buttons: 'rounded-lg',  // 8px
    cards:   'rounded-xl',  // 12px
    badges:  'rounded-md',  // 6px
    avatar:  'rounded-full',
  },
  transitions: 'transition-colors duration-150 ease-in-out',
  focusRing: 'focus-visible:ring-2 focus-visible:ring-olive-400 focus-visible:ring-offset-2',
};

export default tokens;
