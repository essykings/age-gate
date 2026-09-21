import { httpClient } from '@wix/essentials';
import config from '../../wix.config.json';

// The packageName Wix reports for the Pro plan (compared case-insensitively).
export const PRO_PACKAGE_NAME = 'pro';

export interface PlanInfo {
  // 'unknown' means the plan couldn't be read, which is different from being on Free.
  status: 'free' | 'paid' | 'unknown';
  // True when the site is on any paid plan.
  isPaid: boolean;
  // True only on the Pro plan. Gate Pro features on this, not on isPaid.
  isPro: boolean;
  packageName: string | null;
  instanceId: string | null;
}

// Only call this from the dashboard or editor panel, which share the app's origin.
export async function fetchPlanInfo(): Promise<PlanInfo> {
  try {
    const response = await httpClient.fetchWithAuth('/api/get-instance');
    if (!response.ok) {
      throw new Error(`Plan check failed: ${response.status}`);
    }
    const data = await response.json();
    const instance = data?.instance;
    if (!instance?.instanceId) {
      throw new Error('Plan check returned no app instance');
    }
    const packageName: string | null = instance.billing?.packageName ?? null;
    // Wix leaves isFree out when it is false, and only includes billing for paying sites.
    // So a site is free only if isFree is explicitly true and it has no paid plan.
    const isFree = instance.isFree === true && !packageName;
    return {
      status: isFree ? 'free' : 'paid',
      isPaid: !isFree,
      isPro: !isFree && packageName?.toLowerCase() === PRO_PACKAGE_NAME,
      packageName,
      instanceId: instance.instanceId,
    };
  } catch (error) {
    console.error('Could not determine Wix plan:', error);
    // Don't grant paid features if the plan can't be confirmed.
    return { status: 'unknown', isPaid: false, isPro: false, packageName: null, instanceId: null };
  }
}

// Wix's pricing page for this app. The instance ID tells Wix which site is upgrading;
// without it (plan request failed) the link still opens the pricing page.
export function getUpgradeUrl(instanceId: string | null): string {
  const base = `https://www.wix.com/apps/upgrade/${config.appId}`;
  return instanceId ? `${base}?appInstanceId=${encodeURIComponent(instanceId)}` : base;
}
