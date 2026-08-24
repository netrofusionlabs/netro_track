import { TextStyle } from 'react-native';

/**
 * NetroTrack Design System — Typography Presets
 *
 * Design philosophy:
 * - Max weight is '700' — never '800'. Enterprise apps don't shout.
 * - Display sizes are restrained — no 32pt text on mobile.
 * - Negative letter spacing on headings for modern, tight feel.
 * - Strict hierarchy: display > heading > body > caption > overline
 * - Every text element in the app must use one of these presets.
 */
export const typography = {
  // ─── Display ───────────────────────────────────────────────────
  /** Hero numbers on dashboard (working hours, revenue totals) — 26pt */
  displayLg: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.5,
  } as TextStyle,

  /** Secondary hero numbers — 20pt */
  displayMd: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: -0.4,
  } as TextStyle,

  /** Screen titles — 22pt */
  displaySm: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  } as TextStyle,

  // ─── Headings ──────────────────────────────────────────────────
  /** Section titles, card titles — 18pt */
  headingLg: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Subsection headers, form titles — 16pt */
  headingMd: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,

  /** List item titles, bold inline text — 14pt */
  headingSm: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.1,
  } as TextStyle,

  // ─── Body ──────────────────────────────────────────────────────
  /** Primary body text, descriptions — 15pt */
  bodyLg: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,

  /** Standard body text — 14pt */
  bodyMd: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  } as TextStyle,

  /** Secondary text, metadata — 13pt */
  bodySm: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  } as TextStyle,

  // ─── Utility ───────────────────────────────────────────────────
  /** Timestamps, counts, small metadata — 12pt */
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  } as TextStyle,

  /** Form labels, section labels — 13pt */
  label: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  } as TextStyle,

  /** Section headers (ATTENDANCE, TODAY'S ACTIVITY) — 11pt uppercase */
  overline: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Section titles for compact areas (e.g. Quick Actions) — 13pt uppercase */
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Bottom tab labels — 11pt */
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  } as TextStyle,

  /** Dashboard stat numbers — 22pt */
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  } as TextStyle,

  /** Monospace numeric displays — 14pt */
  mono: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    fontFamily: undefined, // Falls back to system mono if available
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  // ─── Buttons ───────────────────────────────────────────────────
  /** Primary button text — 15pt */
  button: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  } as TextStyle,

  /** Small button / chip text — 13pt */
  buttonSm: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  } as TextStyle,
};
