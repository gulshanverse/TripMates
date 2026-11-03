CREATE TABLE IF NOT EXISTS trip_completion_evidence (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(64) NOT NULL,
  participant_id VARCHAR(36) NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  review_window_expires_at TIMESTAMP NOT NULL,
  UNIQUE KEY trip_completion_participant_unique (trip_id, participant_id),
  CONSTRAINT trip_completion_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id),
  CONSTRAINT trip_completion_participant_fk FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX trip_completion_participant_idx (participant_id, completed_at)
);

CREATE TABLE IF NOT EXISTS organizer_reviews (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(64) NOT NULL,
  organizer_id VARCHAR(36) NOT NULL,
  reviewer_id VARCHAR(36) NOT NULL,
  overall_rating TINYINT UNSIGNED NOT NULL,
  trip_experience_rating TINYINT UNSIGNED NOT NULL,
  organizer_experience_rating TINYINT UNSIGNED NOT NULL,
  feedback VARCHAR(2000) NULL,
  moderation_status ENUM('visible','hidden','under_review') NOT NULL DEFAULT 'visible',
  review_window_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY organizer_review_trip_reviewer_unique (trip_id, reviewer_id),
  CONSTRAINT organizer_reviews_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id),
  CONSTRAINT organizer_reviews_organizer_fk FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT organizer_reviews_reviewer_fk FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX organizer_reviews_organizer_status_idx (organizer_id, moderation_status, created_at),
  CONSTRAINT organizer_reviews_ratings_chk CHECK (overall_rating BETWEEN 1 AND 5 AND trip_experience_rating BETWEEN 1 AND 5 AND organizer_experience_rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS organizer_review_responses (
  id VARCHAR(36) PRIMARY KEY,
  review_id VARCHAR(36) NOT NULL,
  organizer_id VARCHAR(36) NOT NULL,
  response VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY organizer_review_response_unique (review_id),
  CONSTRAINT organizer_review_responses_review_fk FOREIGN KEY (review_id) REFERENCES organizer_reviews(id) ON DELETE CASCADE,
  CONSTRAINT organizer_review_responses_organizer_fk FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organizer_review_response_audit (
  id VARCHAR(36) PRIMARY KEY,
  response_id VARCHAR(36) NOT NULL,
  review_id VARCHAR(36) NOT NULL,
  editor_id VARCHAR(36) NOT NULL,
  action ENUM('created','edited') NOT NULL,
  response VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT organizer_review_response_audit_response_fk FOREIGN KEY (response_id) REFERENCES organizer_review_responses(id),
  CONSTRAINT organizer_review_response_audit_review_fk FOREIGN KEY (review_id) REFERENCES organizer_reviews(id),
  CONSTRAINT organizer_review_response_audit_editor_fk FOREIGN KEY (editor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS organizer_review_reports (
  id VARCHAR(36) PRIMARY KEY,
  review_id VARCHAR(36) NOT NULL,
  reporter_id VARCHAR(36) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('submitted','under_review','action_taken','dismissed') NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY organizer_review_report_unique (review_id, reporter_id),
  CONSTRAINT organizer_review_reports_review_fk FOREIGN KEY (review_id) REFERENCES organizer_reviews(id) ON DELETE CASCADE,
  CONSTRAINT organizer_review_reports_reporter_fk FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organizer_review_moderation (
  id VARCHAR(36) PRIMARY KEY,
  review_id VARCHAR(36) NOT NULL,
  actor_id VARCHAR(36) NOT NULL,
  action ENUM('hidden','restored','under_review') NOT NULL,
  note VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT organizer_review_moderation_review_fk FOREIGN KEY (review_id) REFERENCES organizer_reviews(id),
  CONSTRAINT organizer_review_moderation_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id)
);
