// src/theme.js
import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'background',
        color: 'textPrimary',
      },
    },
  },
  fonts: {
    heading: `'Inter', sans-serif`,
    body: `'Inter', sans-serif`,
  },
  colors: {
    brand: {
      50: '#eaf4ff',
      100: '#c7deff',
      200: '#a4c7ff',
      300: '#7baaed',
      400: '#5190db',
      500: '#2e75c9',  // primary brand
      600: '#2a68b3',
      700: '#225494',
      800: '#1a406d',
      900: '#122a47',
    },
    background: '#f7f9fc',
    card: '#ffffff',
    textPrimary: '#1a202c',
    textMuted: '#4a5568',
    success: '#2f855a',
    danger: '#c53030',
    accent: '#ed64a6',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '24px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.15)',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'md',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: { bg: 'brand.600' },
          _active: { bg: 'brand.700' },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: { bg: 'brand.50' },
        },
      },
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Input: {
      baseStyle: {
        field: {
          bg: 'white',
          borderRadius: 'md',
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          },
        },
      },
    },
    Select: {
      baseStyle: {
        field: {
          bg: 'white',
          borderRadius: 'md',
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        color: 'textPrimary',
      },
    },
    Text: {
      baseStyle: {
        color: 'textPrimary',
      },
    },
  },
});

export default theme;