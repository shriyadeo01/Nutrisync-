/** Screen background used across the app (matches Meals tab). */
export const APP_BACKGROUND = '#FFF0F3';

export const DARK_BLUE_BG = '#0F172A'; // Dark Navy Blue
export const DARK_BLUE_CARD = '#1E293B'; // Slate Blue
export const DARK_BLUE_TEXT = '#F1F5F9'; // Light Gray text for dark mode
export const DARK_BLUE_MUTED = '#94A3B8'; // Muted slate text
export const BLUE_ACCENT = '#3B82F6';

/**
 * Single palette for light/dark so tabs, stack, and screens stay in sync.
 * @param {boolean} isDark
 */
export function getAppTheme(isDark) {
  if (isDark) {
    return {
      bg: DARK_BLUE_BG,
      card: DARK_BLUE_CARD,
      text: DARK_BLUE_TEXT,
      muted: DARK_BLUE_MUTED,
      border: '#334155',
      tabBar: DARK_BLUE_CARD,
      tabBarBorder: '#334155',
      tabInactive: '#94A3B8',
      tabActiveBg: '#4C1D95',
      surfaceMuted: '#0F172A',
      inputBg: '#1E293B',
      chatMessagesBg: '#0F172A',
      assistantBubbleBg: '#1E293B',
      assistantText: DARK_BLUE_TEXT,
      barChartTrack: '#334155',
      tipBg: '#312E81',
      tipText: '#C7D2FE',
      badgeBg: '#1E3A5F',
      actionIconTintBg: 'rgba(34, 197, 94, 0.18)',
    };
  }
  return {
    bg: APP_BACKGROUND,
    card: '#FFFFFF',
    text: '#111827',
    muted: '#6B7280',
    border: '#F3E8EB',
    tabBar: '#FFFFFF',
    tabBarBorder: '#F3E8EB',
    tabInactive: '#9CA3AF',
    tabActiveBg: '#FCE7F3',
    surfaceMuted: '#F9FAFB',
    inputBg: '#F3F4F6',
    chatMessagesBg: '#F9FAFB',
    assistantBubbleBg: '#FFFFFF',
    assistantText: '#1F2937',
    barChartTrack: '#F3F4F6',
    tipBg: '#EEF2FF',
    tipText: '#4338CA',
    badgeBg: '#DBEAFE',
    actionIconTintBg: '#ECFDF5',
  };
}
