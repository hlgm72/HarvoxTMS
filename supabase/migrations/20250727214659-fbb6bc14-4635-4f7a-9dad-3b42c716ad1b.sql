-- Fix auth function calls in RLS policies for better performance
-- Replace auth.<function>() with (select auth.<function>()) to avoid re-evaluation per row

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Create optimized policies using SELECT subqueries for auth functions
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  ((SELECT auth.uid()) IS NOT NULL AND 
   ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
   (SELECT auth.uid()) = user_id)
);

CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR
  ((SELECT auth.uid()) IS NOT NULL AND 
   ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
   (SELECT auth.uid()) = user_id)
);

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  ((SELECT auth.uid()) IS NOT NULL AND 
   ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
   (SELECT auth.uid()) = user_id)
)
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR
  ((SELECT auth.uid()) IS NOT NULL AND 
   ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
   (SELECT auth.uid()) = user_id)
);