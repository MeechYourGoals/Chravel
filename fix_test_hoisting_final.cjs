const fs = require('fs');

function fixFile(filePath, id) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    const originalMock = /vi\.mock\(['"]@\/integrations\/supabase\/client['"], \(\) => \(\{\s*supabase: createMockSupabaseClient\(\),?\s*\}\)\);/m;

    const replacement = `
const { mockClient${id} } = vi.hoisted(() => {
  return {
    mockClient${id}: {
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signOut: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
      }),
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn(),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
          remove: vi.fn(),
        }),
      },
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      }),
      removeChannel: vi.fn(),
    }
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockClient${id}
}));
`;

    if (content.match(originalMock)) {
      content = content.replace(originalMock, replacement);
      // Remove only the specific import to avoid unused variable errors, keep the rest of the import block intact
      content = content.replace(/createMockSupabaseClient,\s*/g, '');
      content = content.replace(/createMockSupabaseClient\s*/g, '');
      // Clean up empty imports
      content = content.replace(/import\s*\{\s*\}\s*from\s*['"].*?supabaseMocks['"];/g, '');
      fs.writeFileSync(filePath, content);
    }
}

fixFile('src/__tests__/utils/testHelpers.tsx', '1');
// The integration test files we will LEAVE ALONE entirely because they are correctly mocked by the factory inside them that works in Vitest when not imported by others.
// The failure ONLY originated from `useAuth` which imported `testHelpers.tsx`.
// So ONLY fixing testHelpers.tsx is the correct solution.
