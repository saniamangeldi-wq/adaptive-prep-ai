
-- Set both new tutor profiles
UPDATE profiles SET 
  role = 'tutor',
  tier = 'tier_2',
  is_trial = false,
  trial_ends_at = NULL,
  onboarding_completed = true,
  credits_remaining = 100,
  tests_remaining = 300
WHERE user_id IN (
  '09f89eef-1dcb-4a65-9246-387ed2ff62b5',
  '297e8587-4610-4299-afed-d0905ea12e0c'
);

-- Add tutor roles
INSERT INTO user_roles (user_id, role) VALUES
  ('09f89eef-1dcb-4a65-9246-387ed2ff62b5', 'tutor'),
  ('297e8587-4610-4299-afed-d0905ea12e0c', 'tutor')
ON CONFLICT (user_id, role) DO NOTHING;
