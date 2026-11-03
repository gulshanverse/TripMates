CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  deactivated_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_email_unique (email)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id VARCHAR(36) PRIMARY KEY,
  photo_url VARCHAR(500) NULL,
  age INT NULL,
  home_location VARCHAR(120) NULL,
  preferred_destinations JSON NOT NULL,
  travel_interests JSON NOT NULL,
  travel_style VARCHAR(60) NULL,
  budget_range VARCHAR(60) NULL,
  languages JSON NOT NULL,
  travel_preferences VARCHAR(500) NULL,
  visibility ENUM('discoverable', 'private') NOT NULL DEFAULT 'discoverable',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT user_profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(64) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX user_sessions_expiry_idx (expires_at)
);

CREATE TABLE IF NOT EXISTS trip_join_requests (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY trip_join_request_pending_unique (trip_id, user_id, status),
  CONSTRAINT trip_join_requests_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id),
  CONSTRAINT trip_join_requests_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX trip_join_requests_trip_status_idx (trip_id, status)
);

CREATE TABLE IF NOT EXISTS trip_participants (
  trip_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trip_id, user_id),
  CONSTRAINT trip_participants_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id),
  CONSTRAINT trip_participants_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS travel_connections (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(64) NOT NULL,
  status ENUM('pending', 'connected', 'declined', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY travel_connections_sender_receiver_unique (sender_id, receiver_id),
  CONSTRAINT travel_connections_sender_fk FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
