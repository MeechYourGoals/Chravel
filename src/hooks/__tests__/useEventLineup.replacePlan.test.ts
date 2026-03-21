import { describe, expect, it } from 'vitest';
import { deriveReplaceImportPlan } from '../useEventLineup';

describe('deriveReplaceImportPlan', () => {
  it('inserts only new names and deletes stale names', () => {
    const plan = deriveReplaceImportPlan(
      ['Alice', 'Cara'],
      [
        { id: 'row-1', name: 'Alice' },
        { id: 'row-2', name: 'Bob' },
      ],
    );

    expect(plan.namesToInsert).toEqual(['Cara']);
    expect(plan.idsToDelete).toEqual(['row-2']);
  });

  it('treats name matches as case-insensitive', () => {
    const plan = deriveReplaceImportPlan(
      ['alice'],
      [
        { id: 'row-1', name: 'ALICE' },
        { id: 'row-2', name: 'BOb' },
      ],
    );

    expect(plan.namesToInsert).toEqual([]);
    expect(plan.idsToDelete).toEqual(['row-2']);
  });
});
