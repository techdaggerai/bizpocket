'use client';

interface ActionSheetProps {
  isOpen: boolean;
  msgId: string;
  isOwner: boolean;
  text: string;
  senderName: string;
  isStarred: boolean;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onStar: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: () => void;
  onTranslate: () => void;
  onForward: () => void;
}

export default function MessageActionSheet({
  isOpen, isOwner, text, senderName, isStarred,
  onClose, onReply, onCopy, onStar, onEdit, onDelete, onReact, onTranslate, onForward,
}: ActionSheetProps) {
  if (!isOpen) return null;

  const actions = [
    { icon: '↩️', label: 'Reply', action: onReply, show: true },
    { icon: '↪️', label: 'Forward', action: onForward, show: true },
    { icon: '📋', label: 'Copy', action: onCopy, show: true },
    { icon: '⭐', label: isStarred ? 'Unstar' : 'Star', action: onStar, show: true },
    { icon: '😀', label: 'React', action: onReact, show: true },
    { icon: '🌐', label: 'Translate to…', action: onTranslate, show: true },
    { icon: '📝', label: 'Edit', action: onEdit, show: isOwner },
    { icon: '🗑️', label: 'Delete', action: onDelete, show: isOwner, destructive: true },
  ];

  return (
    <div className="fixed inset-0 z-[55]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl animate-slide-up safe-bottom overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center py-2.5">
          <div className="w-9 h-1 rounded-full bg-[#D1D5DB] dark:bg-gray-600" />
        </div>

        {/* Message preview */}
        <div className="px-4 pb-3 border-b border-[#F0F0F0] dark:border-gray-700">
          <p className="text-[11px] font-medium text-[#9CA3AF] mb-0.5">{senderName}</p>
          <p className="text-[13px] text-[#374151] dark:text-gray-300 line-clamp-2 leading-relaxed">{text}</p>
        </div>

        {/* Actions */}
        <div className="py-1">
          {actions.filter(a => a.show).map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors active:bg-[#F3F4F6] dark:active:bg-gray-700 ${
                (a as { destructive?: boolean }).destructive
                  ? 'text-[#DC2626]'
                  : 'text-[#0A0A0A] dark:text-white'
              }`}
            >
              <span className="text-lg w-6 text-center">{a.icon}</span>
              <span className="text-[15px] font-medium">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div className="border-t border-[#F0F0F0] dark:border-gray-700">
          <button onClick={onClose} className="w-full py-3.5 text-[15px] font-medium text-[#9CA3AF] active:bg-[#F3F4F6] dark:active:bg-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
