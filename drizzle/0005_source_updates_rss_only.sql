-- Convert curated sources to RSS (verified URLs per pipeline optimization plan).
-- Run after 0004_add_signals_source_url. Deactivates sources without RSS; adds new RSS sources.

UPDATE sources SET url = 'https://www.anthropic.com/news/feed_anthropic.xml', source_type = 'rss' WHERE name = 'Anthropic Research';
UPDATE sources SET url = 'https://epochai.substack.com/feed', source_type = 'rss' WHERE name = 'Epoch AI';
UPDATE sources SET url = 'https://metr.substack.com/feed', source_type = 'rss' WHERE name = 'METR';
UPDATE sources SET url = 'https://importai.substack.com/feed', source_type = 'rss' WHERE name = 'Import AI newsletter';
UPDATE sources SET url = 'https://medium.com/ai2-blog/feed', source_type = 'rss' WHERE name = 'AI2 (Allen Institute)';

-- Deactivate sources without RSS (keep in DB for reference).
UPDATE sources SET is_active = false
WHERE name IN ('Stanford HAI', 'ARC Prize', 'OECD AI', 'UK AISI', 'Yoshua Bengio''s Blog');

-- Add new RSS sources (skip if name already exists to allow re-running).
INSERT INTO sources (id, name, url, tier, trust_weight, cadence, domain_type, source_type, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Towards Data Science', 'https://towardsdatascience.com/feed', 'TIER_1', '0.8', 'daily', 'commentary', 'rss', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'Towards Data Science');

INSERT INTO sources (id, name, url, tier, trust_weight, cadence, domain_type, source_type, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Medium AI Tag', 'https://medium.com/feed/tag/artificial-intelligence', 'TIER_1', '0.6', 'daily', 'commentary', 'rss', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'Medium AI Tag');

INSERT INTO sources (id, name, url, tier, trust_weight, cadence, domain_type, source_type, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Medium ML Tag', 'https://medium.com/feed/tag/machine-learning', 'TIER_1', '0.6', 'daily', 'commentary', 'rss', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'Medium ML Tag');

INSERT INTO sources (id, name, url, tier, trust_weight, cadence, domain_type, source_type, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'The Gradient', 'https://thegradient.pub/rss', 'TIER_1', '0.8', 'daily', 'research', 'rss', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'The Gradient');

INSERT INTO sources (id, name, url, tier, trust_weight, cadence, domain_type, source_type, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Center for AI Safety Newsletter', 'https://newsletter.safe.ai/feed', 'TIER_1', '0.85', 'daily', 'policy', 'rss', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'Center for AI Safety Newsletter');
