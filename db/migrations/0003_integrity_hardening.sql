ALTER TABLE trips ADD COLUMN organizer_user_id VARCHAR(36) NULL AFTER organizer;
ALTER TABLE trips ADD INDEX trips_organizer_user_idx (organizer_user_id);
ALTER TABLE trips ADD CONSTRAINT trips_organizer_user_fk FOREIGN KEY (organizer_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE trip_join_requests DROP INDEX trip_join_request_pending_unique;
ALTER TABLE trip_join_requests ADD UNIQUE KEY trip_join_request_pending_unique (trip_id, user_id, status);
ALTER TABLE trip_participants ADD INDEX trip_participants_user_idx (user_id);
ALTER TABLE travel_connections ADD INDEX travel_connections_receiver_status_idx (receiver_id, status);
