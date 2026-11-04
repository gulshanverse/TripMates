ALTER TABLE saved_trips
  ADD COLUMN user_id VARCHAR(36) NULL AFTER visitor_id,
  ADD INDEX saved_trips_user_idx (user_id),
  ADD CONSTRAINT saved_trips_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX saved_trips_user_trip_unique ON saved_trips (user_id, trip_id);
