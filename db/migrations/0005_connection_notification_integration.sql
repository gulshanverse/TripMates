-- Connection rows are symmetric only after consent; this FK prevents orphaned receivers.
ALTER TABLE travel_connections
  MODIFY receiver_id VARCHAR(36) NOT NULL;

ALTER TABLE travel_connections
  ADD CONSTRAINT travel_connections_receiver_fk
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- The existing pair unique key remains the idempotency guard. These indexes keep
-- incoming/outgoing lifecycle queries bounded as the table grows.
ALTER TABLE travel_connections
  ADD INDEX travel_connections_receiver_status_idx (receiver_id, status),
  ADD INDEX travel_connections_sender_status_idx (sender_id, status);
