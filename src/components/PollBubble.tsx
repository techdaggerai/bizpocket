'use client';

import { useState } from 'react';

interface PollData {
  question: string;
  options: string[];
  allowMultiple: boolean;
  anonymous: boolean;
  votes: Record<number, string[]>; // optionIndex → userId[]
}

interface Props {
  pollData: PollData;
  userId: string;
  onVote: (optionIndex: number) => void;
  isOwner: boolean;
}

export default function PollBubble({ pollData, userId, onVote, isOwner }: Props) {
  const [expanded, setExpanded] = useState(false);

  const totalVotes = Object.values(pollData.votes || {}).reduce((sum, users) => sum + users.length, 0);
  const userVoted = Object.entries(pollData.votes || {}).some(([, users]) => users.includes(userId));

  return (
    <div className={`rounded-[12px] px-4 py-3 min-w-[240px] max-w-[300px] ${isOwner ? 'bg-[#4F46E5]' : 'bg-[#F3F3F1]'}`}>
      <p className={`text-[14px] font-semibold mb-3 ${isOwner ? 'text-white' : 'text-slate-50'}`}>
        📊 {pollData.question}
      </p>

      <div className="space-y-2">
        {pollData.options.map((opt, i) => {
          const votes = (pollData.votes || {})[i]?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const voted = (pollData.votes || {})[i]?.includes(userId);

          return (
            <button
              key={i}
              onClick={() => !userVoted && onVote(i)}
              disabled={userVoted && !pollData.allowMultiple}
              className={`w-full rounded-lg px-3 py-2 text-left transition-colors relative overflow-hidden ${
                isOwner
                  ? voted ? 'bg-slate-800/30' : 'bg-slate-800/10 hover:bg-slate-800/20'
                  : voted ? 'bg-[#4F46E5]/10 border border-[#4F46E5]/30' : 'bg-slate-800 hover:bg-slate-800 border border-slate-700'
              } ${userVoted && !pollData.allowMultiple ? 'cursor-default' : ''}`}
            >
              {/* Progress bar background */}
              {userVoted && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${isOwner ? 'bg-slate-800/10' : 'bg-[#4F46E5]/5'}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className={`text-[13px] font-medium ${isOwner ? 'text-white' : 'text-slate-300'}`}>
                  {voted && '✓ '}{opt}
                </span>
                {userVoted && (
                  <span className={`text-[11px] font-semibold shrink-0 ${isOwner ? 'text-white/70' : 'text-[#9CA3AF]'}`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <p className={`text-[11px] ${isOwner ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} {!userVoted && '· Tap to vote'}
        </p>
        {!pollData.anonymous && totalVotes > 0 && (
          <button onClick={() => setExpanded(!expanded)} className={`text-[11px] ${isOwner ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
            {expanded ? 'Hide' : 'Details'}
          </button>
        )}
      </div>

      {expanded && !pollData.anonymous && (
        <div className={`mt-2 pt-2 border-t ${isOwner ? 'border-white/10' : 'border-slate-700'}`}>
          {pollData.options.map((opt, i) => {
            const voters = (pollData.votes || {})[i] || [];
            if (voters.length === 0) return null;
            return (
              <p key={i} className={`text-[10px] ${isOwner ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
                {opt}: {voters.length} vote{voters.length !== 1 ? 's' : ''}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
