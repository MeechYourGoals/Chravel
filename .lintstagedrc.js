module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    () => 'tsc --noEmit', // Type check all files (not just staged)
  ],

  // JSON, CSS, Markdown
  '*.{json,css,md}': ['prettier --write'],

  // Supabase types (read-only, don't format)
  'src/integrations/supabase/types.ts': ['prettier --write'],
};
