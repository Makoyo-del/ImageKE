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

