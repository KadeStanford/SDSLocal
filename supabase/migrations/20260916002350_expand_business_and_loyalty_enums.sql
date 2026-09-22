-- Enum values must be committed before tables, policies, seed rows, or
-- functions can reference them on PostgreSQL versions that enforce enum
-- transaction visibility.
alter type public.business_type add value if not exists 'mobile';
alter type public.loyalty_transaction_type add value if not exists 'points_earned';
