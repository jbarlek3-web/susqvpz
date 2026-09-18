/**
 * These values mirror the single public user plan in Clerk Billing. Keep the
 * key in one place so UI highlights and server-side authorization cannot drift.
 * Prices and trial eligibility are enforced by Clerk, not the browser.
 */
export const PRO_PLAN_KEY = "pro";
export const PRO_TRIAL_DAYS = 1;

/**
 * The Clerk Billing plan slug for Organization-scoped, seat-based billing.
 * Must match the per-seat plan created in the Clerk Dashboard (Billing ->
 * Plans, scoped to Organizations, quantity/seat pricing enabled).
 */
export const ORG_PLAN_KEY = "team";
