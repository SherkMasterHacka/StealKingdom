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

-- 7. Add 'developer' role to profiles constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'developer', 'member', 'viewer'));

-- 8. Update tasks insert policy to allow developers to create tasks
DROP POLICY IF EXISTS "tasks_insert_admin" ON public.tasks;
CREATE POLICY "tasks_insert_admin_or_developer" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'developer'))
);

-- 9. Update tasks update policy to allow developers
DROP POLICY IF EXISTS "tasks_update_member_or_admin" ON public.tasks;
CREATE POLICY "tasks_update_member_or_admin" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'developer', 'member'))
);

-- 10. Allow schedule_items insert for auto-assign (service role handles this)
-- Update schedule_items insert policy to also allow authenticated users to insert for themselves
DROP POLICY IF EXISTS "schedule_items_insert_own" ON public.schedule_items;
CREATE POLICY "schedule_items_insert_authenticated" ON public.schedule_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
