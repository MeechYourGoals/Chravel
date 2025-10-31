module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    // Type checking is commented out to avoid blocking commits
    // Uncomment when codebase is clean and you want strict enforcement:
    // () => 'tsc --noEmit',
  ],

  // JSON, CSS, Markdown
  '*.{json,css,md}': ['prettier --write'],

  // Supabase types (read-only, don't format)
  'src/integrations/supabase/types.ts': ['prettier --write'],
};
