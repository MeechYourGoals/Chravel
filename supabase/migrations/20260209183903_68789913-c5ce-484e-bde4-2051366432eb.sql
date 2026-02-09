ALTER TABLE trips DROP CONSTRAINT valid_enabled_features;

ALTER TABLE trips ADD CONSTRAINT valid_enabled_features
  CHECK (enabled_features <@ ARRAY[
    'agenda', 'calendar', 'chat', 'concierge',
    'lineup', 'media', 'payments', 'places',
    'polls', 'tasks', 'team'
  ]::text[]);