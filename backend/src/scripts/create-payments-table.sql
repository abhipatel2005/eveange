-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50), -- razorpay, stripe, paypal, etc.
  payment_gateway_id VARCHAR(255), -- Gateway-specific payment ID
  gateway_payment_id VARCHAR(255), -- Gateway's internal payment ID
  gateway_order_id VARCHAR(255), -- Gateway's order ID
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  payment_date TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  gateway_response JSONB, -- Store full gateway response for debugging
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  refund_date TIMESTAMP WITH TIME ZONE,
  refund_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Policy: Event organizers can view payments for their events
CREATE POLICY "Organizers can view event payments" ON payments
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Policy: Admins can view all payments
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: System can insert payments (for payment processing)
CREATE POLICY "System can insert payments" ON payments
  FOR INSERT WITH CHECK (true);

-- Policy: System can update payments (for payment status updates)
CREATE POLICY "System can update payments" ON payments
  FOR UPDATE USING (true);

-- Add payment_status column to registrations table
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'completed', 'failed', 'refunded'));
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

-- Create index for payment status
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON registrations(payment_status);

-- Update trigger for payments updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();