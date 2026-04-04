'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const TRANSLATIONS = [
  { text: 'あなたが足りないEを連れてくる。私たちが世界を届ける。', color: '#F59E0B', rtl: false },
  { text: 'أنتَ تُكمل الحرف الناقص. ونحن نجلب لك العالم.', color: '#F43F5E', rtl: true },
  { text: 'آپ وہ لفظ لائیں جو ادھورا ہے۔ ہم دنیا لے آئیں۔', color: '#4F46E5', rtl: true },
  { text: '당신이 빠진 E를 가져오세요. 우리가 세상을 가져다 드립니다.', color: '#10B981', rtl: false },
  { text: 'आप वो गुमशुदा E लाइए। हम दुनिया लाते हैं।', color: '#3B82F6', rtl: false },
  { text: 'Tú traes la E que falta. Nosotros traemos el mundo.', color: '#F59E0B', rtl: false },
  { text: '你带来缺失的E。我们带来整个世界。', color: '#F43F5E', rtl: false },
  { text: 'Você traz o E que falta. Nós trazemos o mundo.', color: '#4F46E5', rtl: false },
  { text: 'Vous apportez le E manquant. Nous apportons le monde.', color: '#10B981', rtl: false },
  { text: 'Ikaw ang nagdadala ng nawawalang E. Kami ang nagdadala ng mundo.', color: '#3B82F6', rtl: false },
];

const ENGLISH_LINE = 'You bring the missing e. We bring the world.';

export default function AnimatedTagline() {
  const [engText, setEngText] = useState('');
  const [engDone, setEngDone] = useState(false);
  const [transText, setTransText] = useState('');
  const [transIdx, setTransIdx] = useState(0);
  const [transVisible, setTransVisible] = useState(true);
  const [typing, setTyping] = useState<'eng' | 'trans' | 'hold' | 'fade'>('eng');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Type English line once
  useEffect(() => {
    if (engDone) return;
    let i = 0;
    const type = () => {
      if (i <= ENGLISH_LINE.length) {
        setEngText(ENGLISH_LINE.slice(0, i));
        i++;
        timerRef.current = setTimeout(type, 40);
      } else {
        setEngDone(true);
        setTyping('trans');
      }
    };
    timerRef.current = setTimeout(type, 500);
    return clear;
  }, [engDone, clear]);

  // Cycle translations
  useEffect(() => {
    if (!engDone) return;

    const current = TRANSLATIONS[transIdx];

    if (typing === 'trans') {
      let i = 0;
      setTransText('');
      setTransVisible(true);
      const type = () => {
        if (i <= current.text.length) {
          setTransText(current.text.slice(0, i));
          i++;
          timerRef.current = setTimeout(type, 30);
        } else {
          setTyping('hold');
        }
      };
      timerRef.current = setTimeout(type, 500);
    } else if (typing === 'hold') {
      timerRef.current = setTimeout(() => setTyping('fade'), 2000);
    } else if (typing === 'fade') {
      setTransVisible(false);
      timerRef.current = setTimeout(() => {
        setTransIdx((transIdx + 1) % TRANSLATIONS.length);
        setTyping('trans');
      }, 300);
    }

    return clear;
  }, [engDone, typing, transIdx, clear]);

  const current = TRANSLATIONS[transIdx];
  const showCursor = typing === 'eng' || typing === 'trans';

  // Render English text with emerald "e" — "You bring the missing e. We..."
  // "You bring the missing " = 22 chars, "e" at index 22
  const eIdx = 22;
  const engRendered = engText.length <= eIdx
    ? <>{engText}</>
    : <>{engText.slice(0, eIdx)}<span className="text-[#10B981] text-[24px] italic" style={{ fontFamily: "Georgia, serif" }}> {engText[eIdx]} </span>{engText.slice(eIdx + 1)}</>;

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[18px] text-[#1F2937] dark:text-[#E0E0E0]" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 500, minHeight: '1.5em' }}>
        {engRendered}
        {typing === 'eng' && <span className="animate-pulse text-[#F59E0B]">|</span>}
      </p>
      <p
        className="text-[18px] font-medium transition-opacity duration-300"
        style={{
          color: current.color,
          opacity: transVisible ? 1 : 0,
          direction: current.rtl ? 'rtl' : 'ltr',
          minHeight: '1.8em',
          fontFamily: current.rtl ? "'Noto Sans Arabic', 'Noto Sans', sans-serif" : undefined,
        }}
      >
        {transText}
        {typing === 'trans' && showCursor && <span className="animate-pulse text-[#F59E0B]">|</span>}
      </p>
    </div>
  );
}
