/**
 * PocketChat Translation Bridge
 * Real-time AI translation between any two of 13 supported languages.
 */

import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const LANGUAGES: Record<string, { name: string; native: string; flag: string }> = {
  en: { name: 'English', native: 'English', flag: '🇬🇧' },
  ja: { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  ur: { name: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  ar: { name: 'Arabic', native: 'العربية', flag: '🇦🇪' },
  bn: { name: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
  pt: { name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  fil: { name: 'Filipino', native: 'Filipino', flag: '🇵🇭' },
  vi: { name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  tr: { name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  zh: { name: 'Chinese', native: '中文', flag: '🇨🇳' },
  fr: { name: 'French', native: 'Français', flag: '🇫🇷' },
  nl: { name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
  es: { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
};

export interface TranslationResult {
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  targetLanguage: string;
  translations: Record<string, string>;
}

export async function translateMessage(
  text: string,
  senderLanguage: string,
  recipientLanguage: string
): Promise<TranslationResult> {
  if (senderLanguage === recipientLanguage) {
    return {
      originalText: text,
      originalLanguage: senderLanguage,
      translatedText: text,
      targetLanguage: recipientLanguage,
      translations: { [senderLanguage]: text },
    };
  }

  try {
    const response = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, fromLanguage: senderLanguage, toLanguage: recipientLanguage }),
    });

    if (!response.ok) throw new Error('Translation API failed');
    const data = await response.json();

    return {
      originalText: text,
      originalLanguage: senderLanguage,
      translatedText: data.translatedText,
      targetLanguage: recipientLanguage,
      translations: { [senderLanguage]: text, [recipientLanguage]: data.translatedText },
    };
  } catch {
    return {
      originalText: text,
      originalLanguage: senderLanguage,
      translatedText: text,
      targetLanguage: recipientLanguage,
      translations: { [senderLanguage]: text },
    };
  }
}

export function getDisplayText(
  message: {
    content?: string;
    message?: string;
    original_text?: string;
    original_language?: string;
    translations?: Record<string, string>;
  },
  viewerLanguage: string
): { text: string; isTranslated: boolean; originalLanguage: string | null } {
  const translations = message.translations || {};
  if (translations[viewerLanguage]) {
    return {
      text: translations[viewerLanguage],
      isTranslated: viewerLanguage !== (message.original_language || 'en'),
      originalLanguage: message.original_language || null,
    };
  }
  return {
    text: message.original_text || message.message || message.content || '',
    isTranslated: false,
    originalLanguage: message.original_language || null,
  };
}

export async function translateAndSend({
  conversationId, senderId, senderLanguage, recipientLanguage, text, orgId,
}: {
  conversationId: string; senderId: string; senderLanguage: string; recipientLanguage: string; text: string; orgId: string;
}) {
  const translation = await translateMessage(text, senderLanguage, recipientLanguage);
  const { data, error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: text,
    original_text: translation.originalText,
    original_language: translation.originalLanguage,
    translations: translation.translations,
    org_id: orgId,
    type: 'text',
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) throw error;
  return data;
}

export async function getRecipientLanguage(recipientId: string): Promise<string> {
  const { data: profile } = await supabase.from('profiles').select('preferred_language').eq('id', recipientId).single();
  if (profile?.preferred_language) return profile.preferred_language;
  const { data: contact } = await supabase.from('contacts').select('language').eq('id', recipientId).single();
  if (contact?.language) return contact.language;
  return 'ja';
}
