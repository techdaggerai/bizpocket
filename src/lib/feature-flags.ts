/** Feature flags — set to false to hide non-functional features */
export const FEATURES = {
  videoCalls: false,
  voiceCalls: false,
  voiceTranslation: true,
  websiteBuilder: 'coming-soon' as const,
} as const;
