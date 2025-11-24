-- Enable realtime subscriptions for settings table
-- This allows frontend to receive live updates when settings change

ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
