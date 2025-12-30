-- Initialize Apache AGE Extension
-- This script runs automatically on container startup

-- Load AGE extension
CREATE EXTENSION IF NOT EXISTS age;

-- Load AGE into memory
LOAD 'age';

-- Set search path to include ag_catalog
ALTER DATABASE "NovelyticalDb" SET search_path = ag_catalog, "$user", public;

-- Create graph for novels
SELECT create_graph('novelytical_graph');

-- Verify installation
SELECT * FROM ag_catalog.ag_graph;

\echo '✅ Apache AGE initialized successfully!'
