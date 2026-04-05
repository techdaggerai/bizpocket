'use client';

import { useState } from 'react';

interface Props {
  message: string;
  onSchedule: (sendAt: Date) => void;
  onClose: () => void;
}

export default function ScheduleMessageModal({ message, onSchedule, onClose }: Props) {
  const now = new Date();
  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  const [date, setDate] = useState(tomorrow9am.toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');

  const scheduledDate = new Date(`${date}T${time}`);
  const isValid = scheduledDate > now;

  function handleSchedule() {
    if (!isValid) return;
    onSchedule(scheduledDate);
  }

  const formatted = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }) + ' at ' + scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm sm:mx-4 bg-slate-800 rounded-t-2xl sm:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <button onClick={onClose} className="text-sm text-[#9CA3AF]">Cancel</button>
          <p className="text-[15px] font-bold text-slate-50">⏰ Schedule Message</p>
          <button onClick={handleSchedule} disabled={!isValid} className="text-sm text-[#4F46E5] font-bold disabled:opacity-30">Schedule</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Message preview */}
          <div className="bg-slate-700 rounded-xl px-3.5 py-2.5">
            <p className="text-[13px] text-slate-300 line-clamp-2">{message}</p>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              min={now.toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-50 focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          {/* Time */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-50 focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-indigo-950/20 px-4 py-3 border border-[#C7D2FE]/30 border-indigo-800/30">
            <p className="text-[12px] text-[#A5B4FC]">
              {isValid ? `Message will be sent on ${formatted}` : 'Please select a future date and time'}
            </p>
          </div>

          {/* Quick options */}
          <div className="flex gap-2">
            {[
              { label: 'Tomorrow 9 AM', hours: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; })() },
              { label: 'Tonight 8 PM', hours: (() => { const d = new Date(); d.setHours(20, 0, 0, 0); return d; })() },
              { label: 'Monday 9 AM', hours: (() => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); d.setHours(9, 0, 0, 0); return d; })() },
            ].filter(q => q.hours > now).map(q => (
              <button
                key={q.label}
                onClick={() => { setDate(q.hours.toISOString().split('T')[0]); setTime(q.hours.toTimeString().slice(0, 5)); }}
                className="flex-1 rounded-lg border border-slate-700 py-2 text-[11px] font-medium text-slate-300 active:bg-slate-700"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
