'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import OutlinePillButton from '@/components/OutlinePillButton';
import PageHeader from '@/components/PageHeader';

const ROLES = [
  { key: 'staff', label: 'Staff', desc: 'View dashboard, create invoices, log cash flow' },
  { key: 'accountant', label: 'Accountant', desc: 'View financials, export reports, read-only' },
  { key: 'manager', label: 'Manager', desc: 'Full access except billing and settings' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-[#4F46E5]/10 text-indigo-400',
  manager: 'bg-[#7C3AED]/10 text-[#7C3AED]',
  staff: 'bg-[#16A34A]/10 text-[#16A34A]',
  accountant: 'bg-[#F59E0B]/10 text-[#F59E0B]',
};

type TabKey = 'team' | 'docs' | 'activity';

export default function TeamHubPage() {
  const { organization, user, profile } = useAuth();
  const { toast } = useToast();
  const [supabase] = useState(() => createClient());

  const [tab, setTab] = useState<TabKey>('team');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invites, setInvites] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [docs, setDocs] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviting, setInviting] = useState(false);

  // Doc upload
  const [uploading, setUploading] = useState(false);
  const [docNote, setDocNote] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [membersRes, invitesRes, docsRes, actRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, name, email, role, created_at').eq('organization_id', organization.id),
      supabase.from('team_invites').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }),
      supabase.from('team_documents').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('team_activity').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(30),
    ]);
    setMembers(membersRes.data || []);
    setInvites(invitesRes.data || []);
    setDocs(docsRes.data || []);
    setActivity(actRes.data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const { error } = await supabase.from('team_invites').insert({
      organization_id: organization.id,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user.id,
    });
    if (error) {
      toast('Failed: ' + error.message, 'error');
    } else {
      await supabase.from('team_activity').insert({
        organization_id: organization.id, user_id: user.id,
        user_name: profile.full_name || profile.name,
        action: 'invited_member',
        details: `Invited ${inviteEmail.trim()} as ${inviteRole}`,
      });
      toast('Invitation sent!', 'success');
      setInviteEmail('');
      setShowInvite(false);
      fetchData();
    }
    setInviting(false);
  }

  async function cancelInvite(id: string) {
    const { error } = await supabase.from('team_invites').delete().eq('id', id).eq('organization_id', organization.id);
    if (error) { toast('Failed to cancel', 'error'); return; }
    toast('Invite cancelled', 'success');
    fetchData();
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this team member? They will lose access.')) return;
    const { error } = await supabase.from('profiles').update({ organization_id: null, role: 'staff' }).eq('user_id', userId).eq('organization_id', organization.id);
    if (error) { toast('Failed to remove', 'error'); return; }
    await supabase.from('team_activity').insert({
      organization_id: organization.id, user_id: user.id,
      user_name: profile.full_name || profile.name,
      action: 'removed_member', details: 'Removed a team member',
    });
    toast('Member removed', 'success');
    fetchData();
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${organization.id}/team/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) { toast('Upload failed', 'error'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    await supabase.from('team_documents').insert({
      organization_id: organization.id, title: file.name,
      file_url: urlData.publicUrl, file_type: file.type, file_size: file.size,
      uploaded_by: user.id, uploaded_by_name: profile.full_name || profile.name,
      notes: docNote || null,
    });
    await supabase.from('team_activity').insert({
      organization_id: organization.id, user_id: user.id,
      user_name: profile.full_name || profile.name,
      action: 'uploaded_document', details: `Uploaded ${file.name}`,
    });
    toast('Document shared with team!', 'success');
    setDocNote('');
    setUploading(false);
    if (e.target) e.target.value = '';
    fetchData();
  }

  async function deleteDoc(id: string) {
    if (!confirm('Delete this document?')) return;
    const { error } = await supabase.from('team_documents').delete().eq('id', id).eq('organization_id', organization.id);
    if (error) { toast('Failed to delete', 'error'); return; }
    toast('Deleted', 'success');
    fetchData();
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const isAdmin = profile.role === 'owner' || profile.role === 'manager';
  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none';

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Team" backPath="/settings" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Hub</h1>
          <p className="text-sm text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''} · {organization.name}</p>
        </div>
        {isAdmin && (
          showInvite ? (
            <button onClick={() => setShowInvite(false)}
              className="rounded-[20px] border-[1.5px] border-[#DC2626] px-3.5 py-[7px] text-[13px] font-medium text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-colors">
              Cancel
            </button>
          ) : (
            <OutlinePillButton
              label="Invite"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
              color="#F59E0B"
              onClick={() => setShowInvite(true)}
            />
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {([['team', 'Team'], ['docs', 'Shared Docs'], ['activity', 'Activity']] as [TabKey, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key ? 'text-indigo-400 border-b-2 border-[#4F46E5]' : 'text-slate-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* TEAM TAB */}
      {tab === 'team' && (
        <div className="space-y-4">
          {showInvite && (
            <div className="rounded-xl border border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Invite a team member</h3>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email address" className={inputClass} />
              <div className="space-y-2">
                {ROLES.map(r => (
                  <button key={r.key} onClick={() => setInviteRole(r.key)}
                    className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                      inviteRole === r.key ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'border-slate-700 hover:bg-slate-800'
                    }`}>
                    <div>
                      <p className="text-sm font-medium text-white">{r.label}</p>
                      <p className="text-[10px] text-slate-400">{r.desc}</p>
                    </div>
                    {inviteRole === r.key && (
                      <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Members</p>
            {members.map(m => (
              <div key={m.user_id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4F46E5]/10 text-sm font-bold text-indigo-400">
                    {(m.full_name || m.name || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{m.full_name || m.name || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-400">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${ROLE_COLORS[m.role || 'owner']}`}>
                    {m.role || 'owner'}
                  </span>
                  {isAdmin && m.user_id !== user.id && m.role !== 'owner' && (
                    <button onClick={() => removeMember(m.user_id)} className="text-[10px] text-[#DC2626] hover:underline">Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {invites.filter(i => i.status === 'pending').length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Pending Invitations</p>
              {invites.filter(i => i.status === 'pending').map(inv => (
                <div key={inv.id} className="flex items-center justify-between rounded-xl border border-dashed border-slate-700 bg-slate-800 p-3">
                  <div>
                    <p className="text-sm text-slate-400">{inv.email}</p>
                    <p className="text-[10px] text-slate-400">Invited as {inv.role} · {formatTime(inv.created_at)}</p>
                  </div>
                  {isAdmin && <button onClick={() => cancelInvite(inv.id)} className="text-[10px] text-[#DC2626]">Cancel</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DOCS TAB */}
      {tab === 'docs' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-4">
            <div className="flex items-center gap-3">
              <input type="text" value={docNote} onChange={e => setDocNote(e.target.value)}
                placeholder="Add a note (optional)" className={inputClass + ' flex-1'} />
              <label className="cursor-pointer rounded-lg bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4338CA]">
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" className="hidden" onChange={handleDocUpload} disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.txt" />
              </label>
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="rounded-xl border border-slate-700 p-8 text-center">
              <p className="text-sm text-slate-400">No shared documents yet</p>
              <p className="text-[10px] text-slate-400 mt-1">Upload files for your team to access</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const isPdf = doc.file_type?.includes('pdf');
                const isXls = doc.file_type?.includes('sheet') || doc.file_type?.includes('excel');
                const isImg = doc.file_type?.includes('image');
                const iconColor = isPdf ? 'text-[#DC2626]' : isXls ? 'text-[#16A34A]' : isImg ? 'text-[#7C3AED]' : 'text-[#0EA5E9]';
                const iconBg = isPdf ? 'bg-[#DC2626]/10' : isXls ? 'bg-[#16A34A]/10' : isImg ? 'bg-[#7C3AED]/10' : 'bg-[#0EA5E9]/10';
                return (
                  <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                        <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                        <p className="text-[10px] text-slate-400">{doc.uploaded_by_name} · {formatTime(doc.created_at)}{doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}</p>
                        {doc.notes && <p className="text-[10px] text-slate-400 mt-0.5">{doc.notes}</p>}
                      </div>
                    </a>
                    {isAdmin && <button onClick={() => deleteDoc(doc.id)} className="text-[10px] text-[#DC2626] ml-2 shrink-0">Delete</button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ACTIVITY TAB */}
      {tab === 'activity' && (
        <div className="space-y-1.5">
          {activity.length === 0 ? (
            <div className="rounded-xl border border-slate-700 p-8 text-center">
              <p className="text-sm text-slate-400">No activity yet</p>
            </div>
          ) : (
            activity.map(a => {
              const icons: Record<string, string> = {
                invited_member: '👋', removed_member: '❌', uploaded_document: '📄',
                created_invoice: '🧾', logged_cashflow: '💰', default: '📌',
              };
              return (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                  <span className="text-base mt-0.5">{icons[a.action] || icons.default}</span>
                  <div className="flex-1">
                    <p className="text-[13px] text-white">
                      <span className="font-medium">{a.user_name || 'Someone'}</span>{' '}
                      <span className="text-slate-400">{a.details || a.action.replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">{formatTime(a.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
