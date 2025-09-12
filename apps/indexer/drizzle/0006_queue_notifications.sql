CREATE OR REPLACE FUNCTION ecp_indexer_schema.notify_new_events_in_outbox() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('event_outbox_events', '');
  RETURN NULL;
END
$$;

CREATE TRIGGER event_outbox_notify_new_events_trigger
AFTER INSERT ON ecp_indexer_schema.event_outbox
FOR EACH STATEMENT
EXECUTE FUNCTION ecp_indexer_schema.notify_new_events_in_outbox();

CREATE OR REPLACE FUNCTION ecp_indexer_schema.notify_new_webhook_deliveries() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('webhook_deliveries_events', '');
  RETURN NULL;
END
$$;

CREATE TRIGGER app_webhook_delivery_notify_new_webhook_deliveries_trigger
AFTER INSERT ON ecp_indexer_schema.app_webhook_delivery
FOR EACH STATEMENT
EXECUTE FUNCTION ecp_indexer_schema.notify_new_webhook_deliveries();