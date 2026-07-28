import type { CouponInput } from "@vortex/shared";

export const COUPONS_SEED: CouponInput[] = [
  { code: "BEMVINDO10", type: "percent", value: 10, minOrder: 0, maxUses: 100, expiresAt: "2026-12-31", active: true },
  { code: "VORTEX20", type: "percent", value: 20, minOrder: 200, maxUses: 50, expiresAt: "2026-12-31", active: true },
  { code: "FRETE0", type: "free_shipping", value: 100, minOrder: 150, maxUses: 200, expiresAt: "2026-12-31", active: true },
  { code: "MAKER50", type: "fixed", value: 50, minOrder: 300, maxUses: 30, expiresAt: "2026-12-31", active: false },
];
