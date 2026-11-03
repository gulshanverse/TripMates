CREATE TABLE IF NOT EXISTS destinations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  region VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  trip_count INT NOT NULL DEFAULT 0,
  mood VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY destinations_name_unique (name)
);

CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(64) PRIMARY KEY,
  destination_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  summary TEXT NOT NULL,
  start_date VARCHAR(40) NOT NULL,
  end_date VARCHAR(40) NOT NULL,
  duration VARCHAR(80) NOT NULL,
  budget DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  members INT NOT NULL DEFAULT 1,
  capacity INT NOT NULL,
  organizer VARCHAR(120) NOT NULL,
  organizer_initials VARCHAR(4) NOT NULL,
  organizer_verified BOOLEAN NOT NULL DEFAULT FALSE,
  style VARCHAR(60) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX trips_destination_idx (destination_id),
  INDEX trips_dates_idx (start_date, end_date),
  CONSTRAINT trips_destination_fk FOREIGN KEY (destination_id) REFERENCES destinations(id)
);

CREATE TABLE IF NOT EXISTS saved_trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(128) NOT NULL,
  trip_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY saved_trips_visitor_trip_unique (visitor_id, trip_id),
  CONSTRAINT saved_trips_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id)
);

CREATE TABLE IF NOT EXISTS buddy_interests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(128) NOT NULL,
  buddy_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY buddy_interests_visitor_buddy_unique (visitor_id, buddy_id)
);
