-- Marks every saved project with context.built (2026-10-08): true once it
-- holds a site, the designs to pick from, or an app's files. The project
-- limit counts only built projects (project-state.js isBuilt); new saves
-- set the flag themselves - this fills it in for rows saved before.
update project_state
set context = coalesce(context, '{}'::jsonb) || jsonb_build_object('built',
  coalesce(context->>'currentHtml', '') <> ''
  or (jsonb_typeof(context->'variants') = 'array' and jsonb_array_length(context->'variants') > 0)
  or (case jsonb_typeof(context->'appFiles')
        when 'array' then jsonb_array_length(context->'appFiles') > 0
        when 'object' then context->'appFiles' <> '{}'::jsonb
        else false end));
