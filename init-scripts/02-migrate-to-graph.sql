-- Migration: Sync existing novels to AGE graph
-- Run this after AGE is initialized

-- Enable AGE
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- Function to sync novels to graph
DO $$
DECLARE
    novel_record RECORD;
    tag_record RECORD;
BEGIN
    RAISE NOTICE 'Starting novel migration to graph...';
    
    -- Create Novel nodes from existing data
    FOR novel_record IN SELECT "Id", "Title", "Author", "Rating" FROM public."Novels" LOOP
        PERFORM * FROM cypher('novelytical_graph', $$
            MERGE (n:Novel {id: $id})
            SET n.title = $title,
                n.author = $author,
                n.rating = $rating
        $$, agtype_build_map('id', novel_record."Id"::agtype, 
                             'title', novel_record."Title"::agtype,
                             'author', novel_record."Author"::agtype,
                             'rating', novel_record."Rating"::agtype)) as (a agtype);
        
        RAISE NOTICE 'Created node for novel ID: %', novel_record."Id";
    END LOOP;
    
    -- Create Tag nodes and relationships
    FOR tag_record IN 
        SELECT DISTINCT t."Name" as tag_name, nt."NovelId" as novel_id
        FROM public."NovelTags" nt
        JOIN public."Tags" t ON nt."TagId" = t."Id"
    LOOP
        -- Create Tag node if not exists
        PERFORM * FROM cypher('novelytical_graph', $$
            MERGE (t:Tag {name: $name})
        $$, agtype_build_map('name', tag_record.tag_name::agtype)) as (a agtype);
        
        -- Create HAS_TAG relationship
        PERFORM * FROM cypher('novelytical_graph', $$
            MATCH (n:Novel {id: $novel_id})
            MATCH (t:Tag {name: $tag_name})
            MERGE (n)-[:HAS_TAG]->(t)
        $$, agtype_build_map('novel_id', tag_record.novel_id::agtype,
                             'tag_name', tag_record.tag_name::agtype)) as (a agtype);
    END LOOP;
    
    RAISE NOTICE '✅ Migration completed successfully!';
END $$;

-- Verify migration
SELECT * FROM cypher('novelytical_graph', $$
    MATCH (n:Novel)
    RETURN count(n) as novel_count
$$) as (novel_count agtype);

SELECT * FROM cypher('novelytical_graph', $$
    MATCH (t:Tag)
    RETURN count(t) as tag_count
$$) as (tag_count agtype);

SELECT * FROM cypher('novelytical_graph', $$
    MATCH ()-[r:HAS_TAG]->()
    RETURN count(r) as relationship_count
$$) as (relationship_count agtype);
