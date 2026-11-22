-- Trigger 1: Immutability of change_order_line_items once parent change order is approved, declined, or reconciled
CREATE OR REPLACE FUNCTION enforce_line_items_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_status text;
BEGIN
  IF current_setting('session_replication_role', true) = 'replica' THEN
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

DROP TRIGGER IF EXISTS trg_enforce_line_items_immutability ON change_order_line_items;
CREATE TRIGGER trg_enforce_line_items_immutability
BEFORE UPDATE OR DELETE ON change_order_line_items
FOR EACH ROW
EXECUTE FUNCTION enforce_line_items_immutability();

-- Trigger 2: Append-only approval_events
CREATE OR REPLACE FUNCTION enforce_approval_events_append_only()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('session_replication_role', true) = 'replica' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  RAISE EXCEPTION 'approval_events is an immutable append-only audit trail; UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_approval_events_append_only ON approval_events;
CREATE TRIGGER trg_enforce_approval_events_append_only
BEFORE UPDATE OR DELETE ON approval_events
FOR EACH ROW
EXECUTE FUNCTION enforce_approval_events_append_only();
