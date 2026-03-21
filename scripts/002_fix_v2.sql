-- Safe migration script - handles already existing objects
-- Run this in Supabase SQL Editor

-- 1. Fix category constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_category_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_category_check
  CHECK (category IN ('model', 'animation', 'sound', 'vfx', 'ui', 'programming', 'rigger'));

-- 2. Fix status constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'review', 'approved', 'rejected', 'completed'));

-- 3. Add missing columns
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE public.task_files ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 4. Notifications table (skip if exists)
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop policies first then recreate
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_authenticated" ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 5. Schedule items table
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
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_items_select_own" ON public.schedule_items;
DROP POLICY IF EXISTS "schedule_items_insert_own" ON public.schedule_items;
DROP POLICY IF EXISTS "schedule_items_insert_authenticated" ON public.schedule_items;
DROP POLICY IF EXISTS "schedule_items_update_own" ON public.schedule_items;
DROP POLICY IF EXISTS "schedule_items_delete_own" ON public.schedule_items;

CREATE POLICY "schedule_items_select_own" ON public.schedule_items FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "schedule_items_insert_authenticated" ON public.schedule_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "schedule_items_update_own" ON public.schedule_items FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "schedule_items_delete_own" ON public.schedule_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_schedule_items_user_id ON public.schedule_items(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_due_date ON public.schedule_items(due_date);

-- Trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS update_schedule_items_updated_at ON public.schedule_items;
CREATE TRIGGER update_schedule_items_updated_at
  BEFORE UPDATE ON public.schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Add developer role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'developer', 'member', 'viewer'));

-- 7. Update task policies for developer role
DROP POLICY IF EXISTS "tasks_insert_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_admin_or_developer" ON public.tasks;
CREATE POLICY "tasks_insert_admin_or_developer" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'developer'))
);

DROP POLICY IF EXISTS "tasks_update_member_or_admin" ON public.tasks;
CREATE POLICY "tasks_update_member_or_admin" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'developer', 'member'))
);
