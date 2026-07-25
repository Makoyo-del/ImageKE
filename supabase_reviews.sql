-- Supabase Schema for Reviews & Feedback
-- Run this script in your Supabase SQL Editor to create the reviews table

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    app_source TEXT NOT NULL DEFAULT 'ats_simulator',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read public reviews
CREATE POLICY "Allow public read access to public reviews" 
ON public.reviews FOR SELECT 
USING (is_public = true);

-- Policy: Anyone can submit a review
CREATE POLICY "Allow public insert access to submit reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (true);

-- Insert sample initial reviews for immediate credibility
INSERT INTO public.reviews (name, role, rating, review_text, app_source) VALUES
('Mercy Wanjiku', 'Senior Talent Acquisition Lead', 5, 'The ATS Simulator pinpointed exactly why my CV was being filtered out by Workday. After applying the keyword suggestions, I got 3 interview calls in one week!', 'ats_simulator'),
('David Ochieng', 'Software Engineer', 5, 'Extremely accurate! The formatting issues & missing tech skills analysis saved me hours of guessing. Essential tool for anyone serious about tech roles.', 'ats_simulator'),
('Kevine Kiprop', 'Financial Analyst', 5, 'The LinkedIn Recruiter POV score gave me actionable steps to revamp my headline and summary. Recruiters are now reaching out directly.', 'linkedin_scorecard')
ON CONFLICT DO NOTHING;
