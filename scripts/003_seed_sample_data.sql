-- Seed sample data for Local POS Depot

-- Insert sample admin user (this will be created when someone signs up with admin role)
-- The trigger will handle profile creation

-- Sample departments and positions data
-- This would be inserted after users sign up, but here's the structure

-- Sample sales leads for testing
INSERT INTO public.sales_leads (
  id,
  assigned_to,
  company_name,
  contact_name,
  email,
  phone,
  address,
  industry,
  lead_source,
  status,
  priority,
  score,
  estimated_value,
  notes,
  next_follow_up
) VALUES 
-- These will be inserted after we have actual users
-- Keeping this as a template for now
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'ABC Restaurant', 'John Smith', 'john@abcrestaurant.com', '555-0101', '123 Main St, New York, NY', 'Restaurant', 'Website', 'new', 'high', 85, 15000.00, 'Interested in POS system upgrade', '2024-01-15'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'XYZ Retail', 'Jane Doe', 'jane@xyzretail.com', '555-0102', '456 Oak Ave, Brooklyn, NY', 'Retail', 'Referral', 'contacted', 'medium', 70, 8500.00, 'Looking for inventory management solution', '2024-01-20')
ON CONFLICT (id) DO NOTHING;

-- Note: Actual user data will be created through the application signup process
-- This script provides the structure and some sample leads for testing
