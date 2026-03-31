'use client';

import { useAuth } from '@/lib/auth-context';

export interface PlanLimits {
  plan: 'trial' | 'free' | 'pro' | 'business' | 'enterprise';
  displayPlan: string;
  isTrial: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
  invoicesPerMonth: number;
  translationsPerDay: number;
  pocketChatContacts: number;
  languages: number;
  hasAIBriefing: boolean;
  hasExpensePlanner: boolean;
  hasAccountantPortal: boolean;
  hasAccountantWrite: boolean;
  hasBusinessRadar: boolean;
  hasVoiceTranslation: boolean;
  hasCustomBranding: boolean;
  hasComplianceToolkit: boolean;
  hasStaffAccounts: boolean;
  maxStaff: number;
  snapVaultLimit: number;
  hasPriorityAI: boolean;
  canUpgradeTo: string[];
}

const PLAN_CONFIGS: Record<string, Omit<PlanLimits, 'plan' | 'displayPlan' | 'isTrial' | 'trialDaysLeft' | 'trialExpired' | 'canUpgradeTo'>> = {
  free: {
    invoicesPerMonth: 3,
    translationsPerDay: 10,
    pocketChatContacts: 999, // unlimited contacts, translation limited
    languages: 1,
    hasAIBriefing: false,
    hasExpensePlanner: false,
    hasAccountantPortal: false,
    hasAccountantWrite: false,
    hasBusinessRadar: false,
    hasVoiceTranslation: false,
    hasCustomBranding: false,
    hasComplianceToolkit: false,
    hasStaffAccounts: false,
    maxStaff: 1,
    snapVaultLimit: 10,
    hasPriorityAI: false,
  },
  pro: {
    invoicesPerMonth: 999,
    translationsPerDay: 999,
    pocketChatContacts: 999,
    languages: 5,
    hasAIBriefing: true,
    hasExpensePlanner: true,
    hasAccountantPortal: true,
    hasAccountantWrite: false,
    hasBusinessRadar: false,
    hasVoiceTranslation: false,
    hasCustomBranding: false,
    hasComplianceToolkit: false,
    hasStaffAccounts: false,
    maxStaff: 3,
    snapVaultLimit: 999,
    hasPriorityAI: false,
  },
  business: {
    invoicesPerMonth: 999,
    translationsPerDay: 999,
    pocketChatContacts: 999,
    languages: 13,
    hasAIBriefing: true,
    hasExpensePlanner: true,
    hasAccountantPortal: true,
    hasAccountantWrite: true,
    hasBusinessRadar: true,
    hasVoiceTranslation: true,
    hasCustomBranding: true,
    hasComplianceToolkit: true,
    hasStaffAccounts: true,
    maxStaff: 10,
    snapVaultLimit: 999,
    hasPriorityAI: true,
  },
  enterprise: {
    invoicesPerMonth: 999,
    translationsPerDay: 999,
    pocketChatContacts: 999,
    languages: 13,
    hasAIBriefing: true,
    hasExpensePlanner: true,
    hasAccountantPortal: true,
    hasAccountantWrite: true,
    hasBusinessRadar: true,
    hasVoiceTranslation: true,
    hasCustomBranding: true,
    hasComplianceToolkit: true,
    hasStaffAccounts: true,
    maxStaff: 999,
    snapVaultLimit: 999,
    hasPriorityAI: true,
  },
};

export function usePlan(): PlanLimits {
  const { organization } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = organization as any;
  const rawPlan = org.plan || 'free';
  const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const now = new Date();

  // Check trial status
  const isTrial = rawPlan === 'free' && trialEndsAt !== null && trialEndsAt > now;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialExpired = trialEndsAt !== null && trialEndsAt <= now && rawPlan === 'free';

  // Determine effective plan
  const effectivePlan = isTrial ? 'pro' : rawPlan;
  const config = PLAN_CONFIGS[effectivePlan] || PLAN_CONFIGS.free;

  // Display plan name
  const displayPlan = isTrial ? `Pro Trial (${trialDaysLeft}d left)` : rawPlan;

  // Upgrade options
  const upgradeMap: Record<string, string[]> = {
    free: ['pro', 'business'],
    pro: ['business'],
    business: ['enterprise'],
    enterprise: [],
  };

  return {
    plan: isTrial ? 'trial' : (rawPlan as PlanLimits['plan']),
    displayPlan,
    isTrial,
    trialDaysLeft,
    trialExpired,
    canUpgradeTo: upgradeMap[rawPlan] || [],
    ...config,
  };
}
