ALTER TABLE conversations
  ADD COLUMN trip_id VARCHAR(64) NULL,
  ADD INDEX conversations_trip_idx (trip_id),
  ADD CONSTRAINT conversations_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
