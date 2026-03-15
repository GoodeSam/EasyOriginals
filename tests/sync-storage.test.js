/**
 * TDD Tests for sync-storage module.
 * Guest mode: localStorage only.
 * Account mode: remote sync + localStorage cache.
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';

let syncStorage;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  syncStorage = await import('../src/sync-storage.js');
});

// All syncable data keys
const SYNC_KEYS = [
  'reader-font-size',
  'reader-content-width',
  'reader-theme',
  'reader-notes',
  'reader-wordlist',
  'reader-history',
  'reader-provider',
  'reader-model',
];

describe('guest mode storage (default)', () => {
  test('getItem reads from localStorage', () => {
    localStorage.setItem('reader-theme', 'black');
    expect(syncStorage.getItem('reader-theme')).toBe('black');
  });

  test('setItem writes to localStorage', () => {
    syncStorage.setItem('reader-font-size', '20');
    expect(localStorage.getItem('reader-font-size')).toBe('20');
  });

  test('removeItem removes from localStorage', () => {
    localStorage.setItem('reader-theme', 'brown');
    syncStorage.removeItem('reader-theme');
    expect(localStorage.getItem('reader-theme')).toBeNull();
  });

  test('getItem returns null for missing key', () => {
    expect(syncStorage.getItem('nonexistent')).toBeNull();
  });
});

describe('SYNC_KEYS constant', () => {
  test('exports the list of syncable keys', () => {
    expect(syncStorage.SYNC_KEYS).toEqual(expect.arrayContaining(SYNC_KEYS));
    expect(syncStorage.SYNC_KEYS.length).toBe(SYNC_KEYS.length);
  });
});

describe('account mode storage', () => {
  test('setRemoteProvider configures remote sync', () => {
    const provider = { push: vi.fn(), pull: vi.fn() };
    syncStorage.setRemoteProvider(provider);
    // Should not throw
    expect(syncStorage.getRemoteProvider()).toBe(provider);
  });

  test('setItem calls remote push when provider is set', async () => {
    const provider = { push: vi.fn().mockResolvedValue(), pull: vi.fn() };
    syncStorage.setRemoteProvider(provider);
    syncStorage.setItem('reader-theme', 'black');
    // Still writes to localStorage immediately
    expect(localStorage.getItem('reader-theme')).toBe('black');
    // Also schedules remote push
    expect(provider.push).toHaveBeenCalledWith('reader-theme', 'black');
  });

  test('removeItem calls remote push with null when provider is set', () => {
    const provider = { push: vi.fn().mockResolvedValue(), pull: vi.fn() };
    syncStorage.setRemoteProvider(provider);
    localStorage.setItem('reader-theme', 'brown');
    syncStorage.removeItem('reader-theme');
    expect(localStorage.getItem('reader-theme')).toBeNull();
    expect(provider.push).toHaveBeenCalledWith('reader-theme', null);
  });

  test('clearRemoteProvider removes remote sync', () => {
    const provider = { push: vi.fn(), pull: vi.fn() };
    syncStorage.setRemoteProvider(provider);
    syncStorage.clearRemoteProvider();
    expect(syncStorage.getRemoteProvider()).toBeNull();
    // setItem should work without errors (falls back to localStorage only)
    syncStorage.setItem('reader-theme', 'green');
    expect(provider.push).not.toHaveBeenCalled();
  });
});

describe('pullAll — sync from remote to local', () => {
  test('pullAll merges remote data into localStorage', async () => {
    const remoteData = {
      'reader-theme': 'black',
      'reader-font-size': '22',
      'reader-notes': '[{"text":"note1"}]',
    };
    const provider = {
      push: vi.fn(),
      pull: vi.fn().mockResolvedValue(remoteData),
    };
    syncStorage.setRemoteProvider(provider);
    await syncStorage.pullAll();

    expect(localStorage.getItem('reader-theme')).toBe('black');
    expect(localStorage.getItem('reader-font-size')).toBe('22');
    expect(localStorage.getItem('reader-notes')).toBe('[{"text":"note1"}]');
  });

  test('pullAll does nothing without a remote provider', async () => {
    localStorage.setItem('reader-theme', 'brown');
    await syncStorage.pullAll(); // Should not throw
    expect(localStorage.getItem('reader-theme')).toBe('brown');
  });

  test('pullAll returns the merged data', async () => {
    const remoteData = { 'reader-theme': 'green' };
    const provider = {
      push: vi.fn(),
      pull: vi.fn().mockResolvedValue(remoteData),
    };
    syncStorage.setRemoteProvider(provider);
    const result = await syncStorage.pullAll();
    expect(result['reader-theme']).toBe('green');
  });
});

describe('pushAll — sync all local data to remote', () => {
  test('pushAll sends all syncable keys to remote', async () => {
    localStorage.setItem('reader-theme', 'black');
    localStorage.setItem('reader-font-size', '24');
    const provider = {
      push: vi.fn().mockResolvedValue(),
      pull: vi.fn(),
      pushAll: vi.fn().mockResolvedValue(),
    };
    syncStorage.setRemoteProvider(provider);
    await syncStorage.pushAll();

    expect(provider.pushAll).toHaveBeenCalledTimes(1);
    const pushed = provider.pushAll.mock.calls[0][0];
    expect(pushed['reader-theme']).toBe('black');
    expect(pushed['reader-font-size']).toBe('24');
  });

  test('pushAll does nothing without a remote provider', async () => {
    await syncStorage.pushAll(); // Should not throw
  });
});

describe('bookmark sync', () => {
  test('setItem works for bookmark keys (reader-bookmark-*)', () => {
    syncStorage.setItem('reader-bookmark-test.pdf', JSON.stringify({ page: 3 }));
    expect(localStorage.getItem('reader-bookmark-test.pdf')).toBe('{"page":3}');
  });

  test('bookmark keys are pushed to remote when provider exists', () => {
    const provider = { push: vi.fn().mockResolvedValue(), pull: vi.fn() };
    syncStorage.setRemoteProvider(provider);
    syncStorage.setItem('reader-bookmark-test.pdf', '{"page":5}');
    expect(provider.push).toHaveBeenCalledWith('reader-bookmark-test.pdf', '{"page":5}');
  });
});
