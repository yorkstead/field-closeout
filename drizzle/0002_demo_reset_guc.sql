-- Replace superuser-only session_replication_role check with custom transaction-local GUC `app.demo_reset`
-- so managed PostgreSQL roles (e.g., Neon neondb_owner) can run idempotent demo resets safely.

CREATE OR REPLACE FUNCTION enforce_line_items_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_status text;
BEGIN
  IF current_setting('app.demo_reset', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT status INTO v_status FROM change_orders WHERE id = OLD.change_order_id;
  IF v_status IN ('approved', 'declined', 'reconciled') THEN
    RAISE EXCEPTION 'Cannot modify or delete line items for change order % because status is %', OLD.change_order_id, v_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_approval_events_append_only()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.demo_reset', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  RAISE EXCEPTION 'approval_events is an immutable append-only audit trail; UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;
