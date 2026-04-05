export interface EmergencyPhrase {
  en: string;
  ja: string;
  category: 'medical' | 'police' | 'general';
}

export const EMERGENCY_PHRASES: EmergencyPhrase[] = [
  // Medical
  { category: 'medical', en: 'I need an ambulance', ja: '救急車を呼んでください' },
  { category: 'medical', en: "I'm having chest pain", ja: '胸が痛いです' },
  { category: 'medical', en: "I'm allergic to medication", ja: '薬のアレルギーがあります' },
  { category: 'medical', en: 'I need a doctor', ja: '医者が必要です' },
  { category: 'medical', en: "I can't breathe", ja: '息ができません' },
  { category: 'medical', en: "I'm diabetic", ja: '糖尿病があります' },
  { category: 'medical', en: 'I have a fever', ja: '熱があります' },
  { category: 'medical', en: "I'm injured", ja: '怪我をしました' },

  // Police
  { category: 'police', en: 'I need help', ja: '助けてください' },
  { category: 'police', en: 'Call the police', ja: '警察を呼んでください' },
  { category: 'police', en: "I've been robbed", ja: '強盗に遭いました' },
  { category: 'police', en: "I'm lost", ja: '道に迷いました' },
  { category: 'police', en: 'There has been an accident', ja: '事故がありました' },

  // General
  { category: 'general', en: "I don't speak Japanese", ja: '日本語が話せません' },
  { category: 'general', en: 'Please speak slowly', ja: 'ゆっくり話してください' },
  { category: 'general', en: 'Can you write it down?', ja: '書いてもらえますか？' },
  { category: 'general', en: 'Where is the nearest hospital?', ja: '一番近い病院はどこですか？' },
  { category: 'general', en: 'Please call this number', ja: 'この番号に電話してください' },
  { category: 'general', en: 'I need an interpreter', ja: '通訳が必要です' },
  { category: 'general', en: 'Thank you for helping', ja: '助けてくれてありがとうございます' },
];

export const EMERGENCY_NUMBERS = [
  { number: '110', label: 'Police', labelJa: '警察' },
  { number: '119', label: 'Fire / Ambulance', labelJa: '消防・救急' },
  { number: '118', label: 'Coast Guard', labelJa: '海上保安庁' },
  { number: '03-5774-0992', label: 'Tokyo English Lifeline', labelJa: '英語相談' },
];

export const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
  medical: { label: 'Medical', icon: '🏥', color: '#DC2626' },
  police: { label: 'Police', icon: '🚔', color: '#2563EB' },
  general: { label: 'General', icon: '🆘', color: '#F59E0B' },
};
