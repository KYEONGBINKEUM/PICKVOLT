-- Add 'free' and 'qa' post types to community_posts
-- Drop old check constraint and add new one with expanded type list

alter table community_posts
  drop constraint if exists community_posts_type_check;

alter table community_posts
  add constraint community_posts_type_check
  check (type in ('review', 'forum', 'compare', 'free', 'qa'));
