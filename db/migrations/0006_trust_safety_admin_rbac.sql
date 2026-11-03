ALTER TABLE users ADD COLUMN role ENUM('user','verified_organizer','support_agent','moderator','admin','super_admin') NOT NULL DEFAULT 'user' AFTER display_name;

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(36) PRIMARY KEY,
  reporter_id VARCHAR(36) NOT NULL,
  target_type ENUM('user','profile','trip','organizer','message') NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  category ENUM('harassment','spam','fraud','misleading_information','unsafe_trip','inappropriate_message','other') NOT NULL,
  reason VARCHAR(180) NOT NULL,
  description VARCHAR(2000) NULL,
  evidence_url VARCHAR(500) NULL,
  status ENUM('submitted','under_review','awaiting_information','action_taken','rejected','closed','appealed') NOT NULL DEFAULT 'submitted',
  priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  assigned_to VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY reports_duplicate_unique (reporter_id,target_type,target_id,category),
  INDEX reports_queue_idx (status,priority,created_at),
  CONSTRAINT reports_reporter_fk FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT reports_assignee_fk FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS moderation_notes (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  body VARCHAR(4000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT moderation_notes_report_fk FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT moderation_notes_author_fk FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) NULL,
  actor_id VARCHAR(36) NOT NULL,
  target_user_id VARCHAR(36) NULL,
  action VARCHAR(60) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT moderation_actions_report_fk FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL,
  CONSTRAINT moderation_actions_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT moderation_actions_target_fk FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX moderation_actions_target_idx (target_user_id,created_at)
);

CREATE TABLE IF NOT EXISTS user_sanctions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  imposed_by VARCHAR(36) NOT NULL,
  type ENUM('warning','messaging_restriction','trip_creation_restriction','temporary_suspension','permanent_suspension') NOT NULL,
  scope VARCHAR(60) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sanctions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT sanctions_actor_fk FOREIGN KEY (imposed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX sanctions_active_idx (user_id,active,ends_at)
);

CREATE TABLE IF NOT EXISTS appeals (
  id VARCHAR(36) PRIMARY KEY,
  sanction_id VARCHAR(36) NOT NULL,
  appellant_id VARCHAR(36) NOT NULL,
  reason VARCHAR(2000) NOT NULL,
  status ENUM('submitted','under_review','approved','rejected','closed') NOT NULL DEFAULT 'submitted',
  reviewed_by VARCHAR(36) NULL,
  decision_note VARCHAR(2000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT appeals_sanction_fk FOREIGN KEY (sanction_id) REFERENCES user_sanctions(id) ON DELETE CASCADE,
  CONSTRAINT appeals_appellant_fk FOREIGN KEY (appellant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT appeals_reviewer_fk FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS organizer_verifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  status ENUM('not_submitted','pending','under_review','verified','rejected','suspended','expired') NOT NULL DEFAULT 'pending',
  submitted_note VARCHAR(1000) NULL,
  reviewed_by VARCHAR(36) NULL,
  review_note VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY organizer_verification_user_unique (user_id),
  CONSTRAINT organizer_verification_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT organizer_verification_reviewer_fk FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(60) NOT NULL,
  target_id VARCHAR(64) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX audit_created_idx (created_at)
);
