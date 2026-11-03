CREATE TABLE IF NOT EXISTS organizer_profiles (
  user_id VARCHAR(36) PRIMARY KEY,
  organizer_type ENUM('individual','business') NOT NULL DEFAULT 'individual',
  organization_name VARCHAR(160) NULL,
  description VARCHAR(1200) NOT NULL,
  contact_preferences JSON NOT NULL,
  operating_location VARCHAR(160) NOT NULL,
  specialties JSON NOT NULL,
  experience_categories JSON NOT NULL,
  public_image_url VARCHAR(500) NULL,
  website_url VARCHAR(500) NULL,
  social_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT organizer_profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
