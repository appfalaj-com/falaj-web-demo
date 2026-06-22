alter table companies
add column if not exists commission_rate numeric(5,2) not null default 0;
