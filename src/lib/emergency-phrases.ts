export interface EmergencyPhrase {
  en: string;
  ja: string;
  romaji: string;
  category: 'medical' | 'police' | 'disaster' | 'daily';
}

export const EMERGENCY_PHRASES: EmergencyPhrase[] = [
  // Medical
  { category: 'medical', en: 'Call an ambulance', ja: '救急車を呼んでください', romaji: 'Kyuukyuusha wo yonde kudasai' },
  { category: 'medical', en: 'I need help', ja: '助けてください', romaji: 'Tasukete kudasai' },
  { category: 'medical', en: 'I am allergic to...', ja: 'アレルギーがあります', romaji: 'Arerugii ga arimasu' },
  { category: 'medical', en: 'I need a doctor', ja: '医者が必要です', romaji: 'Isha ga hitsuyou desu' },
  { category: 'medical', en: "I can't breathe", ja: '息ができません', romaji: 'Iki ga dekimasen' },
  { category: 'medical', en: 'I have chest pain', ja: '胸が痛いです', romaji: 'Mune ga itai desu' },

  // Police
  { category: 'police', en: 'Call the police', ja: '警察を呼んでください', romaji: 'Keisatsu wo yonde kudasai' },
  { category: 'police', en: "I've been robbed", ja: '盗まれました', romaji: 'Nusumaremashita' },
  { category: 'police', en: 'I need to report a crime', ja: '犯罪を届けたいです', romaji: 'Hanzai wo todoke tai desu' },
  { category: 'police', en: 'Where is the nearest police station?', ja: '最寄りの交番はどこですか', romaji: 'Moyori no kouban wa doko desu ka' },

  // Disaster
  { category: 'disaster', en: 'Where is the evacuation area?', ja: '避難場所はどこですか', romaji: 'Hinanbasho wa doko desu ka' },
  { category: 'disaster', en: 'Is there a tsunami warning?', ja: '津波警報が出ていますか', romaji: 'Tsunami keihou ga dete imasu ka' },
  { category: 'disaster', en: 'I need shelter', ja: '避難所が必要です', romaji: 'Hinanjo ga hitsuyou desu' },

  // Daily Emergency
  { category: 'daily', en: "I'm lost", ja: '道に迷いました', romaji: 'Michi ni mayoimashita' },
  { category: 'daily', en: "I don't speak Japanese", ja: '日本語が話せません', romaji: 'Nihongo ga hanasemasen' },
  { category: 'daily', en: 'Please help me', ja: '助けてください', romaji: 'Tasukete kudasai' },
  { category: 'daily', en: 'Where is the hospital?', ja: '病院はどこですか', romaji: 'Byouin wa doko desu ka' },
];

export const EMERGENCY_NUMBERS = [
  { number: '110', label: 'Police', labelJa: '警察', color: '#2563EB' },
  { number: '119', label: 'Fire / Ambulance', labelJa: '消防・救急', color: '#DC2626' },
  { number: '118', label: 'Coast Guard', labelJa: '海上保安庁', color: '#0D9488' },
];

export const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
  medical: { label: 'Medical', icon: '🏥', color: '#DC2626' },
  police: { label: 'Police', icon: '🚔', color: '#2563EB' },
  disaster: { label: 'Disaster', icon: '⚠️', color: '#F59E0B' },
  daily: { label: 'Daily Emergency', icon: '🆘', color: '#64748B' },
};
