-- Create RLS policies for load_stops table
-- Users can view load stops for loads they have access to
CREATE POLICY "Load stops company access - select"
ON public.load_stops
FOR SELECT
USING (
  is_authenticated_non_anon() AND 
  load_id IN (
    SELECT l.id 
    FROM loads l 
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by IN (
        SELECT ucr2.user_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Users can insert load stops for loads they have access to
CREATE POLICY "Load stops company access - insert"
ON public.load_stops
FOR INSERT
WITH CHECK (
  is_authenticated_non_anon() AND 
  load_id IN (
    SELECT l.id 
    FROM loads l 
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by IN (
        SELECT ucr2.user_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Users can update load stops for loads they have access to
CREATE POLICY "Load stops company access - update"
ON public.load_stops
FOR UPDATE
USING (
  is_authenticated_non_anon() AND 
  load_id IN (
    SELECT l.id 
    FROM loads l 
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by IN (
        SELECT ucr2.user_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  is_authenticated_non_anon() AND 
  load_id IN (
    SELECT l.id 
    FROM loads l 
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by IN (
        SELECT ucr2.user_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Users can delete load stops for loads they have access to
CREATE POLICY "Load stops company access - delete"
ON public.load_stops
FOR DELETE
USING (
  is_authenticated_non_anon() AND 
  load_id IN (
    SELECT l.id 
    FROM loads l 
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by IN (
        SELECT ucr2.user_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);