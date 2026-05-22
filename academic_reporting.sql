-- 1. Create the Student Submissions Table (The Professor's Gradebook)
CREATE TABLE IF NOT EXISTS student_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  module_id INTEGER NOT NULL,
  module_name TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  accuracy INTEGER DEFAULT 100,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the Leaderboard View (Professor Friendly)
CREATE OR REPLACE VIEW leaderboard_view 
WITH (security_invoker = true) AS
SELECT 
  username,
  level,
  xp,
  updated_at as last_activity,
  RANK() OVER (ORDER BY xp DESC) as rank
FROM profiles;

-- Enable RLS and permissions
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own history
CREATE POLICY "Users can view their own submissions" 
ON student_submissions FOR SELECT 
USING (auth.uid() = user_id);

-- Allow the app to log new completions
CREATE POLICY "Users can insert their own submissions" 
ON student_submissions FOR INSERT 
WITH CHECK (auth.uid() = user_id);
