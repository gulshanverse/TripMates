ALTER TABLE trips
  ADD COLUMN status ENUM('draft','published','full','ongoing','completed','cancelled') NOT NULL DEFAULT 'published',
  ADD COLUMN min_participants INT NOT NULL DEFAULT 1,
  ADD COLUMN meeting_point VARCHAR(300) NULL,
  ADD COLUMN budget_breakdown JSON NULL,
  ADD COLUMN included_items JSON NULL,
  ADD COLUMN excluded_items JSON NULL,
  ADD COLUMN required_equipment JSON NULL,
  ADD COLUMN preparation_guidance TEXT NULL,
  ADD COLUMN cancellation_policy TEXT NULL,
  ADD COLUMN participation_policy TEXT NULL,
  ADD COLUMN itinerary_details JSON NULL,
  ADD COLUMN published_at TIMESTAMP NULL,
  ADD COLUMN cancelled_at TIMESTAMP NULL,
  ADD COLUMN completed_at TIMESTAMP NULL,
  ADD INDEX trips_status_dates_idx (status,start_date,end_date);

UPDATE trips SET published_at = created_at WHERE status = 'published' AND published_at IS NULL;
