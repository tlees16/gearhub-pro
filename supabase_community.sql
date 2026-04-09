-- Community posts
CREATE TABLE IF NOT EXISTS community_posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  tab         TEXT NOT NULL CHECK (tab IN ('reviews', 'help', 'general')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Comments on posts
CREATE TABLE IF NOT EXISTS community_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_posts_product ON community_posts (product_id, tab);
CREATE INDEX IF NOT EXISTS idx_comments_post ON community_comments (post_id);

-- RLS
ALTER TABLE community_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "posts_read"    ON community_posts    FOR SELECT USING (true);
CREATE POLICY "comments_read" ON community_comments FOR SELECT USING (true);

-- Only authenticated users can insert
CREATE POLICY "posts_insert"    ON community_posts    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_insert" ON community_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only delete their own
CREATE POLICY "posts_delete"    ON community_posts    FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON community_comments FOR DELETE USING (auth.uid() = user_id);
