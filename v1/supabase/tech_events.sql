-- Tech Events Calendar table
CREATE TABLE IF NOT EXISTS tech_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organizer text,
  event_date date NOT NULL,
  end_date date,
  location text,
  url text,
  description text,
  is_approved boolean NOT NULL DEFAULT true,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tech_events_date ON tech_events (event_date);

-- Pre-populate with major 2026-2027 tech events
-- Today is 2026-05-29; include events from June 2026 onwards

INSERT INTO tech_events (name, organizer, event_date, end_date, location, url, description, is_approved) VALUES
(
  'WWDC 2026',
  'Apple',
  '2026-06-08',
  '2026-06-12',
  'San Jose, CA',
  'https://developer.apple.com/wwdc',
  'Apple''s annual Worldwide Developers Conference showcasing the latest in iOS, macOS, visionOS, and developer tools.',
  true
),
(
  'Samsung Unpacked Summer 2026',
  'Samsung',
  '2026-07-10',
  '2026-07-10',
  'Online / TBD',
  'https://www.samsung.com/global/galaxy/events/unpacked/',
  'Samsung''s summer Galaxy Unpacked event expected to feature new foldables and Galaxy AI advancements.',
  true
),
(
  'Apple iPhone Event 2026',
  'Apple',
  '2026-09-09',
  '2026-09-09',
  'Cupertino, CA',
  'https://www.apple.com/apple-events/',
  'Apple''s annual fall event unveiling the iPhone 18 lineup and other hardware.',
  true
),
(
  'Meta Connect 2026',
  'Meta',
  '2026-09-23',
  '2026-09-24',
  'Menlo Park, CA',
  'https://www.meta.com/connect/',
  'Meta''s annual mixed reality and AI developer conference featuring Quest hardware and Horizon platform updates.',
  true
),
(
  'Qualcomm Snapdragon Summit 2026',
  'Qualcomm',
  '2026-10-19',
  '2026-10-21',
  'Maui, HI',
  'https://www.qualcomm.com/snapdragon-summit',
  'Qualcomm''s annual summit unveiling next-generation Snapdragon mobile and PC chipsets.',
  true
),
(
  'CES 2027',
  'Consumer Technology Association',
  '2027-01-06',
  '2027-01-09',
  'Las Vegas, NV',
  'https://www.ces.tech',
  'The world''s most influential technology trade show featuring the latest innovations across all major consumer tech categories.',
  true
),
(
  'MWC Barcelona 2027',
  'GSMA',
  '2027-02-22',
  '2027-02-25',
  'Barcelona, Spain',
  'https://www.mwcbarcelona.com',
  'Mobile World Congress: the global hub for the mobile industry covering connectivity, smartphones, IoT, and enterprise mobility.',
  true
),
(
  'Google I/O 2027',
  'Google',
  '2027-05-11',
  '2027-05-13',
  'Mountain View, CA',
  'https://io.google',
  'Google''s annual developer conference highlighting Android, AI, Cloud, and new Google products and APIs.',
  true
);
