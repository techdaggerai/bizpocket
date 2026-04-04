'use client';

import { useState, useEffect, useRef } from 'react';

const CATEGORIES = [
  { label: '😊', name: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { label: '👋', name: 'Gestures', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾','🖤'] },
  { label: '❤️', name: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶','😻'] },
  { label: '🎉', name: 'Objects', emojis: ['🎉','🎊','🎈','🎁','🏆','🥇','⭐','🌟','💫','✨','🔥','💯','👑','💎','🎯','🎵','🎶','📱','💻','📧','📝','💼','📊','💰','💳','🔑','🏠','✈️','🚗','⏰','📅','☀️','🌙','⛅','🌈'] },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('emoji_recents');
      if (saved) setRecents(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  function pick(emoji: string) {
    onSelect(emoji);
    const updated = [emoji, ...recents.filter(e => e !== emoji)].slice(0, 16);
    setRecents(updated);
    try { localStorage.setItem('emoji_recents', JSON.stringify(updated)); } catch {}
  }

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 w-[300px] bg-white rounded-xl border border-[#E5E5E5] shadow-lg z-50 overflow-hidden">
      {/* Category tabs */}
      <div className="flex border-b border-[#F0F0F0]">
        {recents.length > 0 && (
          <button onClick={() => setActiveTab(-1)} className={`flex-1 py-2 text-lg ${activeTab === -1 ? 'bg-[#F3F4F6]' : 'hover:bg-[#FAFAFA]'}`}>🕐</button>
        )}
        {CATEGORIES.map((cat, i) => (
          <button key={i} onClick={() => setActiveTab(i)} className={`flex-1 py-2 text-lg ${activeTab === i ? 'bg-[#F3F4F6]' : 'hover:bg-[#FAFAFA]'}`}>{cat.label}</button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 max-h-[200px] overflow-y-auto">
        {activeTab === -1 ? (
          <div className="grid grid-cols-8 gap-0.5">
            {recents.map((e, i) => (
              <button key={i} onClick={() => pick(e)} className="h-9 w-9 flex items-center justify-center rounded-lg text-xl hover:bg-[#F3F4F6] transition-colors">{e}</button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {CATEGORIES[activeTab].emojis.map((e, i) => (
              <button key={i} onClick={() => pick(e)} className="h-9 w-9 flex items-center justify-center rounded-lg text-xl hover:bg-[#F3F4F6] transition-colors">{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
