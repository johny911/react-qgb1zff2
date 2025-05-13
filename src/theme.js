// src/theme.js
import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  fonts: {
    heading: `'Inter', sans-serif`,
    body: `'Inter', sans-serif`,
  },
  colors: {
    brand: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#2196F3',
      600: '#1E88E5',
      700: '#1976D2',  // Primary Blue
      800: '#1565C0',
      900: '#0D47A1',
    },
    background: '#F4F6F8',
    card: '#FFFFFF',
    textPrimary: '#212121',
    textMuted: '#616161',
    success: '#2E7D32',
    danger: '#D32F2F',
    accent: '#00BFA5',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'md',
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: 'md',
          padding: '12px',
        },
      },
    },
  },
});

export default theme;