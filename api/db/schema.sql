create table if not exists loan_metadata (
  loan_pubkey text primary key,
  borrower_pubkey text not null,
  principal_usdt numeric(20, 6) not null,
  collateral_usdt numeric(20, 6) not null,
  credit_tier text not null,
  status text not null,
  opened_at timestamptz not null default now(),
  due_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists protocol_analytics (
  id bigserial primary key,
  recorded_at timestamptz not null default now(),
  total_deposits_usdt numeric(20, 6) not null,
  total_borrowed_usdt numeric(20, 6) not null,
  utilization_bps integer not null,
  pool_apy_bps integer not null,
  repayment_success_bps integer not null
);

create table if not exists credit_events (
  id bigserial primary key,
  wallet_hash text not null,
  tier text not null,
  max_loan_usdt numeric(20, 6) not null,
  proof_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists loan_metadata_borrower_idx
  on loan_metadata (borrower_pubkey);

create index if not exists protocol_analytics_recorded_at_idx
  on protocol_analytics (recorded_at desc);
