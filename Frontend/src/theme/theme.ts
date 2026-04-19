export const theme = {
  colors: {
    // Premium Dark Theme Palette
    background: '#0B0D17', // Very dark blue/black
    surface: '#15192B', // Lighter dark for cards/inputs
    primary: '#4DE1C1', // Neon cyan / mint
    secondary: '#8257E5', // Deep purple
    text: '#FFFFFF',
    textSecondary: '#94A3B8', // Gray slate
    border: '#2A2F45',
    error: '#FF5B5B',
    success: '#00E676',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    small: 8,
    medium: 12,
    large: 24,
    round: 9999,
  },
  typography: {
    sizes: {
      small: 12,
      body: 16,
      h3: 20,
      h2: 24,
      h1: 32,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      bold: '700' as const,
    }
  }
};
