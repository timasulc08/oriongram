import { createTheme } from '@mui/material/styles';

export const m3 = {
  light: {
    primary:'#6750A4',onPrimary:'#FFFFFF',
    primaryContainer:'#EADDFF',onPrimaryContainer:'#21005D',
    secondary:'#625B71',onSecondary:'#FFFFFF',
    secondaryContainer:'#E8DEF8',onSecondaryContainer:'#1D192B',
    tertiary:'#7D5260',tertiaryContainer:'#FFD8E4',
    surface:'#FEF7FF',onSurface:'#1D1B20',
    surfaceVariant:'#E7E0EC',onSurfaceVariant:'#49454F',
    outline:'#79747E',outlineVariant:'#CAC4D0',
    error:'#B3261E',onError:'#FFFFFF',errorContainer:'#F9DEDC',
    shadow:'#000000',
    surfaceContainerLowest:'#FFFFFF',surfaceContainerLow:'#F7F2FA',
    surfaceContainer:'#F3EDF7',surfaceContainerHigh:'#ECE6F0',
    surfaceContainerHighest:'#E6E0E9',
    msgOut:'#EADDFF',msgOutText:'#21005D',
    msgIn:'#F3EDF7',msgInText:'#1D1B20',
    codeBackground:'#F5F0FF',codeBorder:'#E0D6F0',codeText:'#2D1B69',
    success:'#2E7D32',
  },
  dark: {
    primary:'#D0BCFF',onPrimary:'#381E72',
    primaryContainer:'#4F378B',onPrimaryContainer:'#EADDFF',
    secondary:'#CCC2DC',onSecondary:'#332D41',
    secondaryContainer:'#4A4458',onSecondaryContainer:'#E8DEF8',
    tertiary:'#EFB8C8',tertiaryContainer:'#633B48',
    surface:'#141218',onSurface:'#E6E0E9',
    surfaceVariant:'#49454F',onSurfaceVariant:'#CAC4D0',
    outline:'#938F99',outlineVariant:'#49454F',
    error:'#F2B8B5',onError:'#601410',errorContainer:'#8C1D18',
    shadow:'#000000',
    surfaceContainerLowest:'#0F0D13',surfaceContainerLow:'#1D1B20',
    surfaceContainer:'#211F26',surfaceContainerHigh:'#2B2930',
    surfaceContainerHighest:'#36343B',
    msgOut:'#4F378B',msgOutText:'#EADDFF',
    msgIn:'#2B2930',msgInText:'#E6E0E9',
    codeBackground:'#1A1525',codeBorder:'#2D2640',codeText:'#D0BCFF',
    success:'#4CAF50',
  },
};

export function createM3Theme(mode: 'light'|'dark') {
  const t = m3[mode];
  return createTheme({
    palette: {
      mode,
      primary:{main:t.primary,contrastText:t.onPrimary},
      secondary:{main:t.secondary,contrastText:t.onSecondary},
      error:{main:t.error,contrastText:t.onError},
      background:{default:t.surface,paper:t.surfaceContainerLow},
      text:{primary:t.onSurface,secondary:t.onSurfaceVariant},
      divider:t.outlineVariant,
    },
    shape:{borderRadius:16},
    typography:{
      fontFamily:'"Inter","Roboto",sans-serif',
      button:{textTransform:'none' as const,fontWeight:500},
    },
    components:{
      MuiCssBaseline:{styleOverrides:{body:{backgroundColor:t.surface}}},
    },
  });
}
