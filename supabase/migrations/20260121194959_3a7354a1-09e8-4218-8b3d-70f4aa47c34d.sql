-- Add card_color column for user-selectable trip colors (Pro Trips and Events)
ALTER TABLE trips 
ADD COLUMN card_color TEXT;

-- Add check constraint for valid color values
ALTER TABLE trips 
ADD CONSTRAINT valid_card_color 
CHECK (card_color IS NULL OR card_color IN ('red', 'amber', 'blue', 'purple', 'emerald', 'rose', 'cyan', 'indigo'));

-- Add comment for documentation
COMMENT ON COLUMN trips.card_color IS 'User-selected card color for Pro Trips and Events. Valid values: red, amber, blue, purple, emerald, rose, cyan, indigo';