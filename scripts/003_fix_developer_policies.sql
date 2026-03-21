-- Fix RLS policies to include developer role
-- Run this in Supabase SQL Editor

-- 1. Fix task_files INSERT policy to include developer
DROP POLICY IF EXISTS "task_files_insert_member_or_admin" ON public.task_files;
CREATE POLICY "task_files_insert_member_or_admin" ON public.task_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'developer', 'member'))
);

-- 2. Fix comments INSERT policy to include developer
DROP POLICY IF EXISTS "comments_insert_member_or_admin" ON public.comments;
CREATE POLICY "comments_insert_member_or_admin" ON public.comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'developer', 'member'))
);

-- 3. Fix activity_logs INSERT policy to include developer (if exists)
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_authenticated" ON public.activity_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
