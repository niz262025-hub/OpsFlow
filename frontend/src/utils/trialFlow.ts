export interface TrialCompanyPayload {
  name: string;
  ownerName: string;
  ownerEmail: string;
  status: 'trial';
  plan: 'basic';
  trialDays: 7;
  trialStartsAt: Date;
  trialEndsAt: Date;
  isDemo?: boolean;
}

export function buildTrialCompanyData(name: string, ownerName: string, ownerEmail: string): TrialCompanyPayload {
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(now.getDate() + 7);

  return {
    name,
    ownerName,
    ownerEmail,
    status: 'trial',
    plan: 'basic',
    trialDays: 7,
    trialStartsAt: now,
    trialEndsAt,
  };
}
