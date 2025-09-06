-- Create coaching_reports table
CREATE TABLE IF NOT EXISTS coaching_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    report_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    attendance_score INTEGER NOT NULL DEFAULT 0,
    sales_performance INTEGER NOT NULL DEFAULT 0,
    lead_conversion INTEGER NOT NULL DEFAULT 0,
    overall_rating VARCHAR(20) NOT NULL DEFAULT 'Satisfactory',
    recommendations TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coaching_reports_employee_id ON coaching_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_coaching_reports_month ON coaching_reports(report_month);
CREATE INDEX IF NOT EXISTS idx_coaching_reports_created_at ON coaching_reports(created_at);

-- Enable RLS
ALTER TABLE coaching_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own coaching reports" ON coaching_reports
    FOR SELECT USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can insert coaching reports" ON coaching_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can update coaching reports" ON coaching_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Create email_digests table for tracking email notifications
CREATE TABLE IF NOT EXISTS email_digests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent',
    report_month VARCHAR(7) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for email_digests
ALTER TABLE email_digests ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for email_digests
CREATE POLICY "Admins can view all email digests" ON email_digests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
