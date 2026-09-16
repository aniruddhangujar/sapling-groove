/**
 * Sapling Groove — Community Support Service
 * 
 * Manages external, provider-hosted sponsorship and donation links.
 * Sapling does not collect, store, or process any payment credentials.
 * 
 * CORE PRODUCT PRINCIPLE:
 * "Sapling's core experience is free to use."
 * Supporting the Grove is entirely voluntary and sustains hosting, 
 * compute, and continuous maintenance for students and thinkers worldwide.
 */

export interface SupportTier {
  id: string;
  name: string;
  amountLabel: string;
  cadence: 'monthly' | 'one-time';
  botanicalArchetype: string;
  description: string;
}

export const SUPPORT_TIERS: SupportTier[] = [
  {
    id: 'seedling',
    name: 'Seedling Caretaker',
    amountLabel: '$3 / mo',
    cadence: 'monthly',
    botanicalArchetype: 'Bamboo',
    description: 'Sponsors database persistence and basic serverless compute for students.'
  },
  {
    id: 'canopy',
    name: 'Canopy Steward',
    amountLabel: '$5 / mo',
    cadence: 'monthly',
    botanicalArchetype: 'Oak',
    description: 'Nourishes continuous soundscape synthesis, Ani focus intelligence, and bandwidth.'
  },
  {
    id: 'rainmaker',
    name: 'Rainmaker',
    amountLabel: 'Custom / One-time',
    cadence: 'one-time',
    botanicalArchetype: 'Sequoia',
    description: 'A generous splash of water that directly funds domain renewal and open development.'
  }
];

export const SUPPORT_URL: string = 
  (import.meta.env.VITE_SUPPORT_URL as string) || 'https://github.com/sponsors/aniruddhangujar';

/**
 * Safely launches the external, provider-hosted checkout in a new browser tab.
 * No payment tokens, card numbers, or billing info touch Sapling Groove.
 */
export function openExternalSupport(customUrl?: string): void {
  const target = customUrl || SUPPORT_URL;
  if (typeof window !== 'undefined') {
    window.open(target, '_blank', 'noopener,noreferrer');
  }
}
