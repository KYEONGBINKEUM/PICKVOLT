-- Widen community_posts.category to also allow the new IT blog categories
-- (non-destructive: old product-category values stay valid so existing rows are unaffected)

alter table community_posts
  drop constraint if exists community_posts_category_check;

alter table community_posts
  add constraint community_posts_category_check
  check (category in (
    'laptop', 'mobile', 'tablet', 'other',
    'ai', 'pc_laptop', 'hardware', 'software', 'platform',
    'security', 'cloud', 'semiconductor', 'game', 'mobility'
  ));
