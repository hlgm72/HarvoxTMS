-- ================================
-- PRODUCTION SAFETY TABLES
-- ================================

-- Table to store automated backups
CREATE TABLE public.system_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id TEXT UNIQUE NOT NULL,
  table_name TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'critical', -- 'critical', 'full', 'manual'
  record_count INTEGER NOT NULL DEFAULT 0,
  backup_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  is_compressed BOOLEAN DEFAULT false,
  checksum TEXT,
  status TEXT DEFAULT 'completed' -- 'completed', 'failed', 'partial'
);

-- Add indexes for efficient backup retrieval
CREATE INDEX idx_system_backups_table_name ON public.system_backups(table_name);
CREATE INDEX idx_system_backups_backup_type ON public.system_backups(backup_type);
CREATE INDEX idx_system_backups_created_at ON public.system_backups(created_at DESC);
CREATE INDEX idx_system_backups_expires_at ON public.system_backups(expires_at);

-- Table to log deployment events and rollbacks
CREATE TABLE public.deployment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL, -- 'deploy_start', 'deploy_success', 'deploy_failed', 'rollback_start', 'rollback_success'
  version_from TEXT,
  version_to TEXT,
  github_commit_sha TEXT,
  environment TEXT NOT NULL DEFAULT 'production', -- 'staging', 'production'
  initiated_by UUID REFERENCES auth.users(id),
  event_data JSONB DEFAULT '{}',
  health_check_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' -- 'in_progress', 'completed', 'failed'
);

-- Add indexes for deployment tracking
CREATE INDEX idx_deployment_log_event_type ON public.deployment_log(event_type);
CREATE INDEX idx_deployment_log_environment ON public.deployment_log(environment);
CREATE INDEX idx_deployment_log_created_at ON public.deployment_log(created_at DESC);
CREATE INDEX idx_deployment_log_status ON public.deployment_log(status);

-- Table to store system health metrics
CREATE TABLE public.system_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_status TEXT NOT NULL, -- 'healthy', 'degraded', 'critical'
  health_percentage NUMERIC(5,2) NOT NULL,
  database_status BOOLEAN DEFAULT false,
  authentication_status BOOLEAN DEFAULT false,
  critical_tables_status BOOLEAN DEFAULT false,
  acid_functions_status BOOLEAN DEFAULT false,
  storage_status BOOLEAN DEFAULT false,
  response_time_ms INTEGER,
  active_connections INTEGER,
  error_rate_percentage NUMERIC(5,2) DEFAULT 0,
  recommendations TEXT[],
  detailed_results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for health monitoring
CREATE INDEX idx_system_health_log_timestamp ON public.system_health_log(check_timestamp DESC);
CREATE INDEX idx_system_health_log_status ON public.system_health_log(overall_status);
CREATE INDEX idx_system_health_log_health_percentage ON public.system_health_log(health_percentage);

-- RLS Policies for system tables (Admin access only)
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY;

-- Only superadmins can access system tables
CREATE POLICY "system_backups_superadmin_only" ON public.system_backups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin' 
      AND is_active = true
    )
  );

CREATE POLICY "deployment_log_superadmin_only" ON public.deployment_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin' 
      AND is_active = true
    )
  );

CREATE POLICY "system_health_log_superadmin_only" ON public.system_health_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin' 
      AND is_active = true
    )
  );

-- Function to clean up old backups automatically
CREATE OR REPLACE FUNCTION public.cleanup_expired_backups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete backups older than their expiry date
  DELETE FROM system_backups 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup action
  INSERT INTO deployment_log (
    deployment_id,
    event_type,
    event_data,
    initiated_by,
    status,
    completed_at
  ) VALUES (
    'cleanup_' || extract(epoch from now()),
    'backup_cleanup',
    jsonb_build_object('deleted_backups', deleted_count),
    auth.uid(),
    'completed',
    now()
  );
  
  RETURN deleted_count;
END;
$function$;

-- Function to log deployment events
CREATE OR REPLACE FUNCTION public.log_deployment_event(
  deployment_id_param TEXT,
  event_type_param TEXT,
  version_from_param TEXT DEFAULT NULL,
  version_to_param TEXT DEFAULT NULL,
  github_commit_sha_param TEXT DEFAULT NULL,
  environment_param TEXT DEFAULT 'production',
  event_data_param JSONB DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_record RECORD;
BEGIN
  INSERT INTO deployment_log (
    deployment_id,
    event_type,
    version_from,
    version_to,
    github_commit_sha,
    environment,
    initiated_by,
    event_data,
    created_at
  ) VALUES (
    deployment_id_param,
    event_type_param,
    version_from_param,
    version_to_param,
    github_commit_sha_param,
    environment_param,
    auth.uid(),
    event_data_param,
    now()
  ) RETURNING * INTO result_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'deployment_log_id', result_record.id,
    'message', 'Deployment event logged successfully'
  );
END;
$function$;

-- Function to log system health checks
CREATE OR REPLACE FUNCTION public.log_health_check(
  overall_status_param TEXT,
  health_percentage_param NUMERIC,
  database_status_param BOOLEAN DEFAULT false,
  authentication_status_param BOOLEAN DEFAULT false,
  critical_tables_status_param BOOLEAN DEFAULT false,
  acid_functions_status_param BOOLEAN DEFAULT false,
  storage_status_param BOOLEAN DEFAULT false,
  response_time_ms_param INTEGER DEFAULT NULL,
  detailed_results_param JSONB DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_record RECORD;
BEGIN
  INSERT INTO system_health_log (
    overall_status,
    health_percentage,
    database_status,
    authentication_status,
    critical_tables_status,
    acid_functions_status,
    storage_status,
    response_time_ms,
    detailed_results,
    check_timestamp
  ) VALUES (
    overall_status_param,
    health_percentage_param,
    database_status_param,
    authentication_status_param,
    critical_tables_status_param,
    acid_functions_status_param,
    storage_status_param,
    response_time_ms_param,
    detailed_results_param,
    now()
  ) RETURNING * INTO result_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'health_log_id', result_record.id,
    'status', overall_status_param,
    'health_percentage', health_percentage_param
  );
END;
$function$;