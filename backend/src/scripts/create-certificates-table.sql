-- Certificates table for storing certificate generation data
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  certificate_code VARCHAR(255) UNIQUE NOT NULL,
  participant_name VARCHAR(255) NOT NULL,
  event_title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate certificates
  UNIQUE(event_id, registration_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_registration_id ON certificates(registration_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);

-- RLS (Row Level Security) policies
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view certificates for their own registrations
CREATE POLICY "Users can view their own certificates" ON certificates
  FOR SELECT
  USING (
    registration_id IN (
      SELECT id FROM registrations WHERE user_id = auth.uid()
    )
  );

-- Policy: Organizers and admins can view certificates for their events
CREATE POLICY "Organizers can view event certificates" ON certificates
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Policy: Only organizers and admins can insert certificates
CREATE POLICY "Organizers can create certificates" ON certificates
  FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Policy: Only organizers and admins can update certificates
CREATE POLICY "Organizers can update certificates" ON certificates
  FOR UPDATE
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Policy: Only organizers and admins can delete certificates
CREATE POLICY "Organizers can delete certificates" ON certificates
  FOR DELETE
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );