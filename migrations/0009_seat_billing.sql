-- Seat-based org billing: capture Stripe subscription seat quantity.
alter table stripe_entitlements add column if not exists seat_count integer;
