import { formatCents } from "./money";

export interface TenantThemeConfig {
  primaryColor: string;
  accentColor: string;
  badgeLabel: string;
}

export interface TenantProfile {
  id: string;
  slug: string;
  name: string;
  tradeType: string;
  approvalThresholdCents: number;
  disclaimerText: string;
  themeConfig: TenantThemeConfig;
}

export const CANONICAL_DEMO_TENANT: TenantProfile = {
  id: "a0000000-0000-4000-8000-000000000001",
  slug: "northstar-mechanical",
  name: "Northstar Mechanical & Plumbing",
  tradeType: "HVAC & Plumbing",
  approvalThresholdCents: 50000, // $500.00
  disclaimerText:
    "Change-Order Record Only — pre-tax flat-rate estimate. Not payment processing, tax advice, or legal advice.",
  themeConfig: {
    primaryColor: "#0284c7",
    accentColor: "#0f172a",
    badgeLabel: "HVAC & Plumbing",
  },
};

export function getTenantThresholdDisplay(thresholdCents: number): string {
  return formatCents(thresholdCents);
}

export function resolveTenantProfile(tenant?: Partial<TenantProfile> | null): TenantProfile {
  if (!tenant) {
    return CANONICAL_DEMO_TENANT;
  }

  return {
    id: tenant.id || CANONICAL_DEMO_TENANT.id,
    slug: tenant.slug || CANONICAL_DEMO_TENANT.slug,
    name: tenant.name || CANONICAL_DEMO_TENANT.name,
    tradeType: tenant.tradeType || CANONICAL_DEMO_TENANT.tradeType,
    approvalThresholdCents:
      typeof tenant.approvalThresholdCents === "number"
        ? tenant.approvalThresholdCents
        : CANONICAL_DEMO_TENANT.approvalThresholdCents,
    disclaimerText: tenant.disclaimerText || CANONICAL_DEMO_TENANT.disclaimerText,
    themeConfig: {
      primaryColor: tenant.themeConfig?.primaryColor || CANONICAL_DEMO_TENANT.themeConfig.primaryColor,
      accentColor: tenant.themeConfig?.accentColor || CANONICAL_DEMO_TENANT.themeConfig.accentColor,
      badgeLabel: tenant.themeConfig?.badgeLabel || CANONICAL_DEMO_TENANT.themeConfig.badgeLabel,
    },
  };
}
