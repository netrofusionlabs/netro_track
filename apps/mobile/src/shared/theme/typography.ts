import { TextStyle } from 'react-native';

/**
 * Centralised typography presets for the NetroTrack design system.
 *
 * Usage:
 *   import { typography } from '@/shared/theme/typography';
 *   <Text style={typography.headingLg}>Dashboard</Text>
 */
export const typography = {
  /** Hero / display numbers — 32pt */
  displayLg: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,

  /** Screen title — 28pt */
  displaySm: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.4,
  } as TextStyle,

  /** Section heading — 22pt */
  headingLg: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  } as TextStyle,

  /** Card title — 18pt */
  headingMd: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Sub-heading — 16pt */
  headingSm: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  } as TextStyle,

  /** Body text (default) — 15pt */
  bodyLg: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,

  /** Body text — 14pt */
  bodyMd: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  /** Small body — 13pt */
  bodySm: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,

  /** Caption / metadata — 12pt */
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  } as TextStyle,

  /** Overline / section labels — 11pt */
  overline: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Stat value — large emphasis numbers */
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  } as TextStyle,

  /** Button label — 15pt */
  button: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  } as TextStyle,

  /** Small button / tag — 13pt */
  buttonSm: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  } as TextStyle,
};
