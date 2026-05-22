-- Master Database Fixes Migration
-- Run this script in your Supabase SQL Editor to resolve profile updates, missing usernames, and Module 2 hanging.

-- =========================================================================
-- 1. Profiles Table Setup & Row Level Security (RLS)
-- =========================================================================

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create fresh RLS policies
CREATE POLICY "Allow public read access to profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow users to update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- =========================================================================
-- 2. Auth Trigger Function for Automatically Creating Profiles
-- =========================================================================

-- Recreate trigger function with robust username parsing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  parsed_username TEXT;
BEGIN
  -- Extract username from metadata or fall back to email prefix
  parsed_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  -- Handle case where email prefix or metadata is empty
  IF parsed_username IS NULL OR parsed_username = '' THEN
    parsed_username := 'Agent_' || substr(new.id::text, 1, 8);
  END IF;

  INSERT INTO public.profiles (id, username, avatar, score, level, xp, tour_completed)
  VALUES (
    new.id,
    parsed_username,
    'male',
    0,
    1,
    0,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- 3. Backfill Existing Profiles with Real Usernames from Auth Metadata
-- =========================================================================

-- First, insert missing profile rows for any existing users in auth.users
INSERT INTO public.profiles (id, username, avatar, score, level, xp, tour_completed)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1),
    'Agent'
  ),
  'male',
  0,
  1,
  0,
  false
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Second, update any existing profiles with the correct usernames if they are currently null/default
UPDATE public.profiles p
SET username = COALESCE(
  u.raw_user_meta_data->>'username',
  split_part(u.email, '@', 1),
  'Agent'
)
FROM auth.users u
WHERE p.id = u.id AND (p.username IS NULL OR p.username = 'Agent' OR p.username = '');


-- =========================================================================
-- 4. Student Submissions Table Setup & RLS (Gradebook)
-- =========================================================================

-- Enable RLS on student submissions
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.student_submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON public.student_submissions;

-- Create fresh RLS policies
CREATE POLICY "Users can view their own submissions"
  ON public.student_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions"
  ON public.student_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 5. Phishing Scenarios Table Setup, RLS & Seed Data
-- =========================================================================

-- Drop the table if it already exists to resolve schema/type conflicts (e.g. if id was previously UUID)
DROP TABLE IF EXISTS public.phishing_scenarios CASCADE;

-- Create the Phishing Scenarios table
CREATE TABLE public.phishing_scenarios (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  brand TEXT NOT NULL,
  sender TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  url TEXT,
  actual_link TEXT,
  red_flags JSONB DEFAULT '[]'::jsonb,
  is_real BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on phishing scenarios
ALTER TABLE public.phishing_scenarios ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DROP POLICY IF EXISTS "Allow public read access to phishing scenarios" ON public.phishing_scenarios;

-- Create fresh RLS policy
CREATE POLICY "Allow public read access to phishing scenarios"
  ON public.phishing_scenarios FOR SELECT
  USING (true);

-- Seed/Insert the Phishing scenarios
INSERT INTO public.phishing_scenarios (id, type, difficulty, brand, sender, subject, content, url, actual_link, red_flags, is_real)
VALUES
  (
    '1',
    'email',
    'Beginner',
    'Netflix',
    'billing@netfl1x-security.com',
    'Final Notice: Update your payment method',
    '<p>Dear Subscriber,</p><p>We were unable to process your most recent membership payment. If we do not receive a valid payment method within 24 hours, your account will be <strong>permanently suspended</strong>.</p><p>Please click the button below to secure your account immediately.</p>',
    'netflix.com/billing-update',
    'http://netfl1x-security.com/login?redirect=secure',
    '[
      {"tool": "sniffer", "location": "url", "description": "Display link says netflix.com, but actual destination is netfl1x-security.com"},
      {"tool": "sentiment", "location": "body", "description": "Uses high-pressure language: ''permanently suspended'' and ''24 hours''"},
      {"tool": "sniffer", "location": "sender", "description": "Sender domain ''netfl1x-security.com'' is not official netflix.com"}
    ]'::jsonb,
    false
  ),
  (
    '2',
    'email',
    'Beginner',
    'Amazon',
    'orders-update@amozon-support.net',
    'Your order #114-5829102-1102 has been cancelled',
    '<p>Hi Customer,</p><p>Your recent order has been cancelled due to a billing error. To restore your order and prevent account closure, kindly verify your identity.</p><p>Click here to login and verify.</p>',
    'amazon.com/verify-account',
    'http://amozon-support.net/login',
    '[
      {"tool": "sniffer", "location": "sender", "description": "Sender domain ''amozon-support.net'' is a typo of amazon.com"},
      {"tool": "sentiment", "location": "body", "description": "Generic greeting ''Hi Customer'' instead of your actual name."}
    ]'::jsonb,
    false
  ),
  (
    '3',
    'email',
    'Beginner',
    'PayPal',
    'service@intl.paypal.com',
    'Receipt for your payment to Target Corporation',
    '<p>Hello,</p><p>You sent a payment of $499.99 USD to Target Corporation. If you did not authorize this transaction, please click the link below immediately to cancel the payment.</p>',
    'paypal.com/dispute/transaction',
    'http://paypal-resolution-center.com/dispute',
    '[
      {"tool": "sniffer", "location": "url", "description": "Actual destination ''paypal-resolution-center.com'' is not the real paypal.com"},
      {"tool": "sentiment", "location": "body", "description": "Creates fake panic with a large unauthorized charge to force a quick click."}
    ]'::jsonb,
    false
  ),
  (
    '4',
    'website',
    'Beginner',
    'Facebook',
    NULL,
    NULL,
    '<div style=''text-align:center; padding: 40px; font-family: sans-serif;''><h1 style=''color: #1877f2;''>facebook</h1><p>You must log in to view this content.</p><input type=''text'' placeholder=''Email or Phone'' style=''display:block; margin: 10px auto; padding: 10px; width: 80%;'' /><input type=''password'' placeholder=''Password'' style=''display:block; margin: 10px auto; padding: 10px; width: 80%;'' /><button style=''background: #1877f2; color: white; border: none; padding: 10px 20px; width: 80%;''>Log In</button></div>',
    'facebook-login-secure.com/auth',
    'http://facebook-login-secure.com/auth',
    '[
      {"tool": "sniffer", "location": "url", "description": "Domain is ''facebook-login-secure.com'', not ''facebook.com''."},
      {"tool": "ssl", "location": "url", "description": "Connection is HTTP, not secure HTTPS."}
    ]'::jsonb,
    false
  ),
  (
    '5',
    'email',
    'Beginner',
    'Apple',
    'appleid@apple-icloud-alert.com',
    'Your Apple ID has been locked.',
    '<p>Dear Apple Customer,</p><p>Your Apple ID was recently used to log in to an iPhone 14 in Russia. For your security, your account is now locked.</p><p>Unlock your account below.</p>',
    'apple.com/unlock',
    'http://apple-icloud-alert.com/unlock',
    '[
      {"tool": "sniffer", "location": "sender", "description": "Sender domain ''apple-icloud-alert.com'' is not official."},
      {"tool": "sentiment", "location": "body", "description": "Generic greeting and panic-inducing scenario (locked out, foreign country)."}
    ]'::jsonb,
    false
  ),
  (
    '6',
    'website',
    'Analyst',
    'Google',
    NULL,
    NULL,
    '<div style=''text-align:center; padding: 20px;''><img src=''https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png'' width=''92'' /><h2 style=''margin-top:20px''>One account. All of Google.</h2><p>Sign in to continue to Gmail.</p><div style=''border: 1px solid #dfe1e5; padding: 10px; border-radius: 4px; margin-top: 20px;''>alex.analyst@gmail.com</div></div>',
    'accounts.google.verify-secure.cc/signin',
    'https://google-login.verify-secure.cc/auth',
    '[
      {"tool": "sniffer", "location": "url", "description": "Root domain is verify-secure.cc, not google.com. (Subdomain spoofing)"},
      {"tool": "ssl", "location": "url", "description": "Certificate issued to ''Let''s Encrypt'', not Google LLC."}
    ]'::jsonb,
    false
  ),
  (
    '7',
    'email',
    'Analyst',
    'IT Helpdesk',
    'it-support@company-portal.com',
    'REQUIRED: Migrate to new Email Server',
    '<p>Hi Team,</p><p>IT is migrating all email accounts to the new Exchange 2026 server tonight. You must log in to the migration portal below to ensure your emails are transferred.</p><p>Failure to do so will result in lost emails.</p><p>- IT Admin</p>',
    'portal.company.com/migrate',
    'https://company-portal.com/auth/migrate',
    '[
      {"tool": "sniffer", "location": "sender", "description": "''company-portal.com'' is often registered by attackers to mimic internal domains."},
      {"tool": "sentiment", "location": "body", "description": "Urgent deadline (''tonight'') and threat of data loss."}
    ]'::jsonb,
    false
  ),
  (
    '8',
    'email',
    'Analyst',
    'LinkedIn',
    'security-noreply@linkedin.com',
    'Successful login from a new device',
    '<p>Hi Alex,</p><p>Your LinkedIn account was just used to sign in from a new device in Tokyo, Japan. If this was you, you can safely ignore this email.</p><p>If you don''t recognize this activity, please check your recent activity and secure your account.</p>',
    'linkedin.com/settings/security/activity',
    'https://www.linkedin.com/settings/security/activity',
    '[
      {"tool": "sniffer", "location": "sender", "description": "Authenticated Sender: security-noreply@linkedin.com"},
      {"tool": "sniffer", "location": "url", "description": "Verified Domain: linkedin.com"},
      {"tool": "ssl", "location": "url", "description": "Valid SSL Issuer: DigiCert Inc"}
    ]'::jsonb,
    true
  ),
  (
    '9',
    'website',
    'Analyst',
    'Microsoft',
    NULL,
    NULL,
    '<div style=''text-align:left; padding: 40px; background: white; color: black;''><img src=''https://logincdn.msauth.net/shared/1.0/content/images/microsoft_logo_ee5c8d9fb6248c938fd0dc19370e90bd.svg'' width=''108'' /><h2 style=''font-size: 24px; margin: 20px 0;''>Sign in</h2><input type=''text'' disabled value=''alex.worker@outlook.com'' style=''width: 100%; border: none; border-bottom: 1px solid black; padding: 5px; margin-bottom: 20px;'' /><p style=''font-size: 13px;''>No account? <a href=''#''>Create one!</a></p></div>',
    'login.microsoftonline.com',
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    '[
      {"tool": "ssl", "location": "url", "description": "Corporate SSL: Microsoft Corporation (EV)"},
      {"tool": "sniffer", "location": "url", "description": "Authentication Authority: login.microsoftonline.com is actually official."}
    ]'::jsonb,
    true
  ),
  (
    '10',
    'email',
    'Analyst',
    'FedEx',
    'tracking@fedex-delivery.com',
    'Delivery Exception: Action Required',
    '<p>Hello,</p><p>Your package could not be delivered due to an unpaid customs fee of $2.99. Please pay the fee to release your package.</p><p>Track and pay here.</p>',
    'fedex.com/tracking/192847192',
    'https://fedex-delivery.com/pay',
    '[
      {"tool": "sniffer", "location": "url", "description": "Link goes to fedex-delivery.com, not fedex.com."},
      {"tool": "sniffer", "location": "sender", "description": "Sender is not from fedex.com."}
    ]'::jsonb,
    false
  ),
  (
    '11',
    'email',
    'Expert',
    'HR Department',
    'sarah.jones@c0mpany.com',
    'Q3 Bonus Structure - Confidential',
    '<p>Hi Alex,</p><p>Attached is the confidential breakdown for the upcoming Q3 bonus payouts. Please review your allocation and confirm the direct deposit details on page 2.</p><p>Best,<br>Sarah Jones<br>VP of Human Resources</p>',
    'company.com/docs/Q3-Bonus.pdf',
    'https://c0mpany.com/login?doc=Q3-Bonus',
    '[
      {"tool": "sniffer", "location": "sender", "description": "Homoglyph attack: Sender is ''c0mpany.com'' (with a zero), not ''company.com''."},
      {"tool": "sentiment", "location": "body", "description": "Exploits greed/curiosity (Confidential Bonus Structure) to trick employees."}
    ]'::jsonb,
    false
  ),
  (
    '12',
    'website',
    'Expert',
    'Chase Bank',
    NULL,
    NULL,
    '<div style=''background:#005eb8; padding: 20px; color: white; text-align:center;''><h2>CHASE</h2></div><div style=''padding: 40px; text-align: center;''><p>Verify your account to restore access.</p><input type=''text'' placeholder=''Username'' style=''display:block; margin: 10px auto; padding: 10px; width: 80%;'' /></div>',
    'secure.chase.com.auth-token.net/login',
    'https://secure.chase.com.auth-token.net/login',
    '[
      {"tool": "sniffer", "location": "url", "description": "Deep subdomain spoofing. The root domain is actually ''auth-token.net''."},
      {"tool": "ssl", "location": "url", "description": "Valid SSL, but issued to auth-token.net, not JPMorgan Chase."}
    ]'::jsonb,
    false
  ),
  (
    '13',
    'email',
    'Expert',
    'GitHub',
    'noreply@github.com',
    '[GitHub] Please verify your device',
    '<p>A new device is trying to sign in to your GitHub account.</p><p>Device: Mac OS X<br>Location: San Francisco, CA</p><p>If this was you, please click the button below to authorize the device.</p>',
    'github.com/sessions/verify',
    'https://github.com/sessions/verify',
    '[
      {"tool": "sniffer", "location": "sender", "description": "Valid sender: noreply@github.com"},
      {"tool": "sniffer", "location": "url", "description": "Valid destination: github.com"}
    ]'::jsonb,
    true
  ),
  (
    '14',
    'email',
    'Expert',
    'CEO (Whaling)',
    'ceo.name@gmail.com',
    'Urgent Request: Are you at your desk?',
    '<p>Alex,</p><p>I am stuck in a board meeting right now and need a massive favor. Can you buy $500 in Apple gift cards for a client presentation? I will reimburse you immediately after the meeting.</p><p>Do not reply to this email, just send the codes here. It''s urgent.</p>',
    'mailto:ceo.name@gmail.com',
    'mailto:ceo.name@gmail.com',
    '[
      {"tool": "sniffer", "location": "sender", "description": "CEO using a generic @gmail.com address instead of corporate email."},
      {"tool": "sentiment", "location": "body", "description": "Classic gift card scam: Urgent request from authority figure bypassing normal channels."}
    ]'::jsonb,
    false
  ),
  (
    '15',
    'website',
    'Expert',
    'Coinbase',
    NULL,
    NULL,
    '<div style=''text-align:center; padding: 40px;''><h1 style=''color:#1652f0''>coinbase</h1><p>Authorize withdrawal of 0.5 BTC</p><p>Please enter your 12-word seed phrase to confirm identity.</p><textarea style=''width: 80%; height: 100px;''></textarea></div>',
    'coinbase-secure.com/wallet',
    'https://coinbase-secure.com/wallet',
    '[
      {"tool": "sniffer", "location": "url", "description": "Fake domain: coinbase-secure.com"},
      {"tool": "sentiment", "location": "body", "description": "Legitimate services will NEVER ask for your 12-word seed phrase."}
    ]'::jsonb,
    false
  )
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  difficulty = EXCLUDED.difficulty,
  brand = EXCLUDED.brand,
  sender = EXCLUDED.sender,
  subject = EXCLUDED.subject,
  content = EXCLUDED.content,
  url = EXCLUDED.url,
  actual_link = EXCLUDED.actual_link,
  red_flags = EXCLUDED.red_flags,
  is_real = EXCLUDED.is_real;
