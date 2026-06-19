-- INSHOP reference PostgreSQL schema
-- Money uses NUMERIC, quantities use INTEGER units, timestamps use TIMESTAMPTZ.
-- Internal primary keys are UUID; legacy/business codes remain unique external identifiers.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE record_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE user_role AS ENUM ('admin', 'inventory_counter', 'supplier_accountant', 'integration_service');
CREATE TYPE delivery_status AS ENUM (
  'draft', 'supplier_reported', 'trustee_pending', 'trustee_in_progress',
  'trustee_received', 'admin_review', 'approved_to_inventory', 'closed', 'cancelled'
);
CREATE TYPE delivery_credit_state AS ENUM (
  'none', 'identified', 'request_created', 'awaiting_supplier',
  'credit_uploaded', 'partially_approved', 'approved', 'closed', 'cancelled'
);
CREATE TYPE media_status AS ENUM ('pending_upload', 'uploaded', 'processing', 'ready', 'rejected', 'deleted_logically');
CREATE TYPE media_type AS ENUM (
  'supplier_invoice', 'supplier_goods', 'trustee_invoice', 'trustee_goods',
  'pantry_before', 'pantry_after', 'credit_document', 'payment_document', 'item_image', 'other'
);
CREATE TYPE invoice_source AS ENUM ('supplier', 'trustee', 'admin');
CREATE TYPE match_source AS ENUM ('supplier_item_code', 'supplier_item_name', 'item_name_similarity', 'ai_visual_text', 'manual', 'unmatched');
CREATE TYPE count_status AS ENUM ('waiting_for_legacy_close', 'ready_to_count', 'in_progress', 'completed', 'locked', 'cancelled', 'failed');
CREATE TYPE credit_status AS ENUM (
  'draft', 'sent_to_supplier', 'waiting_for_credit_invoice', 'credit_uploaded',
  'waiting_admin_approval', 'partially_approved', 'approved', 'rejected_document', 'closed', 'cancelled'
);
CREATE TYPE payment_status AS ENUM ('draft', 'awaiting_document', 'under_review', 'ready_to_post', 'posted', 'partially_reversed', 'reversed', 'cancelled');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'check', 'other');
CREATE TYPE reward_status AS ENUM ('calculated_pending_approval', 'approved', 'push_pending', 'pushed', 'push_failed', 'cancelled', 'reversed');
CREATE TYPE ai_status AS ENUM ('pending', 'processing', 'processed', 'warning', 'failed', 'approved_by_user', 'overridden_by_user', 'superseded');
CREATE TYPE notification_status AS ENUM ('queued', 'sending', 'sent', 'delivered', 'failed_retryable', 'failed_permanent', 'cancelled');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'succeeded', 'retry_scheduled', 'failed_permanent', 'cancelled');
CREATE TYPE ledger_entry_type AS ENUM ('invoice_liability', 'approved_credit', 'payment', 'reversal', 'manual_adjustment', 'opening_balance');
CREATE TYPE inventory_movement_type AS ENUM ('delivery_receipt', 'legacy_sale', 'count_adjustment', 'admin_correction', 'reversal');
CREATE TYPE access_link_status AS ENUM ('active', 'expired', 'revoked', 'completed');
CREATE TYPE order_rule_status AS ENUM ('draft', 'active', 'inactive', 'archived');
CREATE TYPE destination_purpose AS ENUM ('order', 'credit');
CREATE TYPE destination_priority AS ENUM ('primary', 'backup');
CREATE TYPE issue_severity AS ENUM ('info', 'warning', 'error', 'critical');

-- Master data ----------------------------------------------------------------

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status record_status NOT NULL DEFAULT 'active',
  legacy_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  status record_status NOT NULL DEFAULT 'active',
  legacy_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image_url TEXT,
  barcode TEXT,
  assortment_active BOOLEAN NOT NULL DEFAULT true,
  status record_status NOT NULL DEFAULT 'active',
  legacy_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_active_name ON items (assortment_active, name);
CREATE INDEX idx_items_barcode ON items (barcode) WHERE barcode IS NOT NULL;

CREATE TABLE trustees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trustee_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  image_url TEXT,
  primary_branch_id UUID REFERENCES branches(id),
  status record_status NOT NULL DEFAULT 'active',
  legacy_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trustee_branches (
  trustee_id UUID NOT NULL REFERENCES trustees(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (trustee_id, branch_id)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  status record_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE user_branch_permissions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  can_count BOOLEAN NOT NULL DEFAULT false,
  can_review_deliveries BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, branch_id)
);

CREATE TABLE supplier_users (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, supplier_id)
);

CREATE TABLE supplier_item_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  item_id UUID NOT NULL REFERENCES items(id),
  supplier_item_code TEXT,
  supplier_item_name TEXT,
  packaging_qty INTEGER CHECK (packaging_qty IS NULL OR packaging_qty >= 1),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (supplier_item_code IS NOT NULL OR supplier_item_name IS NOT NULL)
);

CREATE UNIQUE INDEX uq_supplier_item_code
  ON supplier_item_codes (supplier_id, supplier_item_code)
  WHERE supplier_item_code IS NOT NULL AND active;
CREATE INDEX idx_supplier_item_codes_item ON supplier_item_codes (supplier_id, item_id);

-- Order rules ----------------------------------------------------------------

CREATE TABLE order_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status order_rule_status NOT NULL DEFAULT 'draft',
  delivery_weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  average_lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (average_lead_time_days BETWEEN 0 AND 365),
  minimum_order_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (minimum_order_amount >= 0),
  version INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (delivery_weekdays <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[])
);

CREATE UNIQUE INDEX uq_active_order_rule
  ON order_rules (branch_id, supplier_id)
  WHERE status = 'active';

CREATE TABLE order_rule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_rule_id UUID NOT NULL REFERENCES order_rules(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  target_inventory_qty INTEGER NOT NULL DEFAULT 0 CHECK (target_inventory_qty >= 0),
  packaging_qty INTEGER NOT NULL DEFAULT 1 CHECK (packaging_qty >= 1),
  preferred_supplier_item_code_id UUID REFERENCES supplier_item_codes(id),
  active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_rule_id, item_id)
);

CREATE TABLE notification_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  branch_id UUID REFERENCES branches(id),
  purpose destination_purpose NOT NULL,
  label TEXT NOT NULL,
  phone TEXT NOT NULL,
  priority destination_priority NOT NULL DEFAULT 'primary',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Access links and idempotency ------------------------------------------------

CREATE TABLE access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  subject_type TEXT,
  subject_id UUID,
  resource_type TEXT,
  resource_id UUID,
  status access_link_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_links_resource ON access_links (resource_type, resource_id);
CREATE INDEX idx_access_links_expiry ON access_links (status, expires_at);

CREATE TABLE idempotency_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_key TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (actor_key, idempotency_key, operation)
);

-- Deliveries, invoices and media ---------------------------------------------

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  branch_id UUID REFERENCES branches(id),
  status delivery_status NOT NULL DEFAULT 'draft',
  credit_state delivery_credit_state NOT NULL DEFAULT 'none',
  selected_branch_id UUID REFERENCES branches(id),
  ai_recognized_supplier_id UUID REFERENCES suppliers(id),
  ai_recognized_branch_id UUID REFERENCES branches(id),
  supplier_reported_at TIMESTAMPTZ,
  trustee_claimed_at TIMESTAMPTZ,
  trustee_received_at TIMESTAMPTZ,
  inventory_approved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_queue ON deliveries (status, created_at);
CREATE INDEX idx_deliveries_supplier_date ON deliveries (supplier_id, supplier_reported_at DESC);
CREATE INDEX idx_deliveries_branch_date ON deliveries (branch_id, supplier_reported_at DESC);

CREATE TABLE delivery_contacts (
  delivery_id UUID PRIMARY KEY REFERENCES deliveries(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type media_type NOT NULL,
  status media_status NOT NULL DEFAULT 'pending_upload',
  storage_key TEXT,
  preview_storage_key TEXT,
  original_filename TEXT,
  content_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  checksum TEXT,
  width INTEGER,
  height INTEGER,
  uploaded_by_user_id UUID REFERENCES users(id),
  uploaded_by_actor_type TEXT,
  uploaded_by_actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at TIMESTAMPTZ,
  rejected_reason TEXT
);

CREATE UNIQUE INDEX uq_media_storage_key ON media_objects (storage_key) WHERE storage_key IS NOT NULL;

CREATE TABLE delivery_media (
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_objects(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_actor_type TEXT NOT NULL,
  PRIMARY KEY (delivery_id, media_id)
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  source invoice_source NOT NULL,
  media_id UUID REFERENCES media_objects(id),
  invoice_number TEXT,
  invoice_date DATE,
  total_amount NUMERIC(14,2) CHECK (total_amount IS NULL OR total_amount >= 0),
  supplier_id UUID REFERENCES suppliers(id),
  branch_id UUID REFERENCES branches(id),
  raw_ocr JSONB,
  ai_status ai_status,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_duplicate ON invoices (supplier_id, branch_id, invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX idx_invoices_delivery ON invoices (delivery_id, source);

CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER,
  raw_name TEXT NOT NULL,
  supplier_item_code TEXT,
  matched_item_id UUID REFERENCES items(id),
  qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  unit_price NUMERIC(14,4) CHECK (unit_price IS NULL OR unit_price >= 0),
  line_total NUMERIC(14,2) CHECK (line_total IS NULL OR line_total >= 0),
  match_source match_source NOT NULL DEFAULT 'unmatched',
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE delivery_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES invoice_lines(id),
  item_id UUID REFERENCES items(id),
  raw_name TEXT NOT NULL,
  supplier_item_code TEXT,
  qty_invoice INTEGER NOT NULL DEFAULT 0 CHECK (qty_invoice >= 0),
  qty_received INTEGER NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  qty_inventory INTEGER NOT NULL DEFAULT 0 CHECK (qty_inventory >= 0),
  unit_price NUMERIC(14,4) CHECK (unit_price IS NULL OR unit_price >= 0),
  include_in_credit BOOLEAN NOT NULL DEFAULT true,
  match_source match_source NOT NULL DEFAULT 'unmatched',
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  confirmed_by_trustee BOOLEAN NOT NULL DEFAULT false,
  confirmed_by_admin BOOLEAN NOT NULL DEFAULT false,
  admin_change_reason TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_lines_delivery ON delivery_lines (delivery_id, sort_order);

CREATE TABLE delivery_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  severity issue_severity NOT NULL,
  message TEXT NOT NULL,
  blocking BOOLEAN NOT NULL DEFAULT false,
  evidence JSONB,
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI -------------------------------------------------------------------------

CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability TEXT NOT NULL,
  status ai_status NOT NULL DEFAULT 'pending',
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  provider TEXT,
  model TEXT,
  model_version TEXT,
  input_media_ids UUID[] NOT NULL DEFAULT '{}',
  input_checksums TEXT[] NOT NULL DEFAULT '{}',
  raw_result JSONB,
  normalized_result JSONB,
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  warnings JSONB NOT NULL DEFAULT '[]'::JSONB,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  overridden_by UUID REFERENCES users(id),
  override_reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_entity ON ai_analyses (entity_type, entity_id, capability, created_at DESC);

-- Inventory ------------------------------------------------------------------

CREATE TABLE inventory_balances (
  branch_id UUID NOT NULL REFERENCES branches(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, item_id)
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  item_id UUID NOT NULL REFERENCES items(id),
  movement_type inventory_movement_type NOT NULL,
  quantity_delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  external_reference TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  reversed_movement_id UUID REFERENCES inventory_movements(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_balance ON inventory_movements (branch_id, item_id, occurred_at, created_at);
CREATE UNIQUE INDEX uq_inventory_external_reference
  ON inventory_movements (movement_type, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  counted_by_user_id UUID NOT NULL REFERENCES users(id),
  status count_status NOT NULL DEFAULT 'waiting_for_legacy_close',
  legacy_close_result JSONB,
  assortment_snapshot_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_active_count_per_branch
  ON inventory_counts (branch_id)
  WHERE status IN ('waiting_for_legacy_close', 'ready_to_count', 'in_progress');

CREATE TABLE inventory_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  default_qty INTEGER NOT NULL DEFAULT 0 CHECK (default_qty >= 0),
  balance_at_start INTEGER NOT NULL DEFAULT 0,
  counted_qty INTEGER NOT NULL DEFAULT 0 CHECK (counted_qty >= 0),
  saved BOOLEAN NOT NULL DEFAULT false,
  saved_at TIMESTAMPTZ,
  last_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 0,
  UNIQUE (count_id, item_id)
);

-- Credits and supplier ledger ------------------------------------------------

CREATE TABLE credit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  delivery_id UUID NOT NULL REFERENCES deliveries(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status credit_status NOT NULL DEFAULT 'draft',
  requested_amount NUMERIC(14,2) NOT NULL CHECK (requested_amount > 0),
  due_date DATE,
  note TEXT,
  sent_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_requests_supplier_status ON credit_requests (supplier_id, status, created_at DESC);

CREATE TABLE credit_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_request_id UUID NOT NULL REFERENCES credit_requests(id) ON DELETE CASCADE,
  delivery_line_id UUID NOT NULL REFERENCES delivery_lines(id),
  item_id UUID NOT NULL REFERENCES items(id),
  qty_invoice INTEGER NOT NULL CHECK (qty_invoice >= 0),
  qty_received INTEGER NOT NULL CHECK (qty_received >= 0),
  shortage_qty INTEGER NOT NULL CHECK (shortage_qty >= 0),
  unit_price NUMERIC(14,4) NOT NULL CHECK (unit_price >= 0),
  requested_amount NUMERIC(14,2) NOT NULL CHECK (requested_amount >= 0),
  reason TEXT,
  UNIQUE (credit_request_id, delivery_line_id)
);

CREATE TABLE credit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_request_id UUID NOT NULL REFERENCES credit_requests(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_objects(id),
  version_number INTEGER NOT NULL,
  document_number TEXT,
  document_date DATE,
  recognized_amount NUMERIC(14,2),
  submitted_amount NUMERIC(14,2),
  approved_amount NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'uploaded',
  submitted_by_user_id UUID REFERENCES users(id),
  reviewed_by_user_id UUID REFERENCES users(id),
  review_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (credit_request_id, version_number)
);

CREATE TABLE supplier_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  entry_type ledger_entry_type NOT NULL,
  amount_signed NUMERIC(14,2) NOT NULL CHECK (amount_signed <> 0),
  currency CHAR(3) NOT NULL DEFAULT 'ILS',
  source_type TEXT NOT NULL,
  source_id UUID,
  reference TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  reversed_entry_id UUID REFERENCES supplier_ledger_entries(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_ledger_balance ON supplier_ledger_entries (supplier_id, occurred_at, created_at);

-- Payments -------------------------------------------------------------------

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status payment_status NOT NULL DEFAULT 'draft',
  expected_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (expected_amount >= 0),
  confirmed_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (confirmed_amount >= 0),
  method payment_method,
  payment_date DATE,
  external_reference TEXT,
  mismatch_override_reason TEXT,
  posted_ledger_entry_id UUID REFERENCES supplier_ledger_entries(id),
  posted_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  posted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_supplier_date ON payments (supplier_id, payment_date DESC, created_at DESC);
CREATE UNIQUE INDEX uq_payment_external_reference
  ON payments (supplier_id, external_reference)
  WHERE external_reference IS NOT NULL AND status = 'posted';

CREATE TABLE payment_documents (
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_objects(id),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (payment_id, media_id)
);

CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  ledger_entry_id UUID NOT NULL REFERENCES supplier_ledger_entries(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payment_id, ledger_entry_id)
);

-- Trustee rewards -------------------------------------------------------------

CREATE TABLE trustee_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trustee_id UUID NOT NULL REFERENCES trustees(id),
  delivery_id UUID NOT NULL UNIQUE REFERENCES deliveries(id),
  invoice_total NUMERIC(14,2) NOT NULL CHECK (invoice_total >= 0),
  reward_percent NUMERIC(7,4) NOT NULL DEFAULT 2.0 CHECK (reward_percent >= 0),
  reward_amount NUMERIC(14,2) NOT NULL CHECK (reward_amount >= 0),
  status reward_status NOT NULL DEFAULT 'calculated_pending_approval',
  legacy_operation_key TEXT UNIQUE,
  approved_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications and jobs ------------------------------------------------------

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  template_version INTEGER NOT NULL DEFAULT 1,
  channel TEXT NOT NULL,
  recipient_masked TEXT,
  recipient_encrypted TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status notification_status NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  payload JSONB NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE integration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  logical_operation_key TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_type, logical_operation_key)
);

CREATE INDEX idx_integration_jobs_claim ON integration_jobs (status, run_after) WHERE status IN ('pending', 'retry_scheduled');

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_claim ON outbox_events (status, run_after) WHERE status IN ('pending', 'retry_scheduled');

-- Legacy and mock imports -----------------------------------------------------

CREATE TABLE legacy_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_type TEXT NOT NULL,
  method TEXT NOT NULL,
  logical_operation_key TEXT,
  request_payload JSONB,
  response_payload JSONB,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  error_code TEXT,
  error_message TEXT,
  correlation_id TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legacy_sync_operation ON legacy_sync_logs (logical_operation_key, created_at DESC);
CREATE INDEX idx_legacy_sync_failures ON legacy_sync_logs (status, created_at DESC);

CREATE TABLE mock_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_type TEXT NOT NULL,
  media_id UUID REFERENCES media_objects(id),
  status job_status NOT NULL DEFAULT 'pending',
  dry_run BOOLEAN NOT NULL DEFAULT true,
  row_count INTEGER,
  valid_row_count INTEGER,
  invalid_row_count INTEGER,
  validation_report JSONB,
  activated_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Audit -----------------------------------------------------------------------

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  correlation_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_type, actor_id, created_at DESC);

-- Helpful views ---------------------------------------------------------------

CREATE VIEW supplier_balances AS
SELECT
  s.id AS supplier_id,
  s.supplier_code,
  s.name,
  COALESCE(SUM(le.amount_signed), 0)::NUMERIC(14,2) AS balance
FROM suppliers s
LEFT JOIN supplier_ledger_entries le ON le.supplier_id = s.id
GROUP BY s.id, s.supplier_code, s.name;

CREATE VIEW credit_request_balances AS
SELECT
  cr.id AS credit_request_id,
  cr.requested_amount,
  COALESCE(SUM(CASE WHEN le.entry_type = 'approved_credit' THEN ABS(le.amount_signed) ELSE 0 END), 0)::NUMERIC(14,2) AS approved_amount,
  GREATEST(
    cr.requested_amount - COALESCE(SUM(CASE WHEN le.entry_type = 'approved_credit' THEN ABS(le.amount_signed) ELSE 0 END), 0),
    0
  )::NUMERIC(14,2) AS remaining_amount
FROM credit_requests cr
LEFT JOIN supplier_ledger_entries le
  ON le.source_type = 'credit_request' AND le.source_id = cr.id
GROUP BY cr.id, cr.requested_amount;

-- Notes for implementation:
-- 1. Add updated_at triggers or update timestamps in application code consistently.
-- 2. Enforce permissions in the application and, if desired, PostgreSQL RLS for supplier portal.
-- 3. Consider partitioning audit/log/movement tables only after measured need.
-- 4. Add organization_id to all tenant data if multi-organization hosting becomes a requirement.
