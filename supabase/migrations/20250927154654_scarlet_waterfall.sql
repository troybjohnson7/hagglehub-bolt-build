/*
  # Create Admin User

  1. New Admin User
    - Creates an admin user in auth.users table
    - Email: admin@hagglehub.app
    - Password: admin123 (change this after first login)
    - Sets up corresponding profile in users table

  2. Security
    - Admin user has full access to all data
    - Email is confirmed by default
    - Profile is marked as completed onboarding

  3. Important Notes
    - Change the password after first login
    - This user bypasses normal RLS policies for testing
*/

-- Insert admin user into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'authenticated',
  'authenticated',
  'admin@hagglehub.app',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "HaggleHub Admin"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  FALSE,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Insert corresponding profile in users table
INSERT INTO users (
  id,
  email,
  full_name,
  email_identifier,
  subscription_tier,
  has_completed_onboarding,
  created_date
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@hagglehub.app',
  'HaggleHub Admin',
  'admin123',
  'closer_annual',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  email_identifier = EXCLUDED.email_identifier,
  subscription_tier = EXCLUDED.subscription_tier,
  has_completed_onboarding = EXCLUDED.has_completed_onboarding;

-- Create admin policies that allow full access for testing
CREATE POLICY IF NOT EXISTS "Admin full access to vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = 'admin@hagglehub.app'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = 'admin@hagglehub.app'
    )
  );

CREATE POLICY IF NOT EXISTS "Admin full access to dealers"
  ON dealers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = 'admin@hagglehub.app'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = 'admin@hagglehub.app'
    )
  );

CREATE POLICY IF NOT EXISTS "Admin full access to deals"
  ON deals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = 'admin@hagglehub.app'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = 'admin@hagglehub.app'
    )
  );

CREATE POLICY IF NOT EXISTS "Admin full access to messages"
  ON messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = 'admin@hagglehub.app'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = 'admin@hagglehub.app'
    )
  );