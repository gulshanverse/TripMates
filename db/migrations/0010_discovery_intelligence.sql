ALTER TABLE trips ADD COLUMN experience_type VARCHAR(80) NULL AFTER style;
ALTER TABLE trips ADD COLUMN tags JSON NOT NULL AFTER experience_type;
CREATE INDEX trips_discovery_filter_idx ON trips (status, destination_id, budget, members, capacity, organizer_verified, style);
