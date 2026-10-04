import { RENK } from './theme';

export const Colors = {
  primary: RENK.vurgu,
  accent: RENK.vurgu,
  gold: '#FBBF24',
  jetonBlue: RENK.mavi,

  background: RENK.arkaPlan,
  surface: RENK.panel,
  surfaceLight: RENK.kart,
  card: RENK.kart,

  text: '#F8FAFC',
  textMuted: RENK.yaziSoluk,
  textPrimary: RENK.yazi,
  textSecondary: RENK.yaziAcik,

  danger: RENK.hata,
  border: RENK.cizgi,
  white: '#FFFFFF',
  dark: '#0F172A',

  success: RENK.basari,
  info: RENK.mavi,
  warning: RENK.vurgu,
} as const;
