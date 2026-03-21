-- Add 'rigger' category and fix status constraint
-- Run this in Supabase SQL Editor

-- 1. Drop and recreate category constraint to include 'rigger'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_category_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_category_check
  CHECK (category IN ('model', 'animation', 'sound', 'vfx', 'ui', 'programming', 'rigger'));

-- 2. Drop and recreate status constraint to include 'approved' and 'rejected'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'review', 'approved', 'rejected', 'completed'));

-- 3. Add 'feedback' column if not exists
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS feedback TEXT;

-- 4. Add 'version' column to task_files if not exists
ALTER TABLE public.task_files ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 5. Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies - users can only see their own
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_authenticated" ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 6. Create schedule_items table for personal to-do list
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  due_time TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS - users can only see their own schedule
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_items_select_own" ON public.schedule_items FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "schedule_items_insert_own" ON public.schedule_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedule_items_update_own" ON public.schedule_items FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "schedule_items_delete_own" ON public.schedule_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_schedule_items_user_id ON public.schedule_items(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_due_date ON public.schedule_items(due_date);

-- Apply updated_at trigger to schedule_items
CREATE TRIGGER update_schedule_items_updated_at
  BEFORE UPDATE ON public.schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
