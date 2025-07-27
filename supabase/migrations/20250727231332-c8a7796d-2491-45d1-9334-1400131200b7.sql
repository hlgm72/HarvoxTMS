-- Clear any cached data by refreshing function cache (optional, helps with immediate refresh)
SELECT invalidate_cache() WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'invalidate_cache');