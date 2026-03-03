const fs = require('fs');

// We have IDB issues because offline sync is trying to hit indexedDB
// Let's mock IDB globally in vitest.setup.js or test-setup.ts
let content = fs.readFileSync('src/test-setup.ts', 'utf8');

if(!content.includes('indexedDB')) {
    content += `
// Mock indexedDB for offlineSyncService
global.indexedDB = {
  open: vi.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
} as any;
`;
    fs.writeFileSync('src/test-setup.ts', content);
}
