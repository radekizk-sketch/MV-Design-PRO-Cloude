import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProject, getProject, listProjects, deleteProject } from '../api';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Projects API', () => {
  describe('createProject', () => {
    it('sends POST request with correct body', async () => {
      const mockProject = {
        id: 'p1',
        name: 'Test Project',
        description: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProject),
      });

      const result = await createProject({ name: 'Test Project' });
      expect(result.id).toBe('p1');
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Project' }),
      });
    });

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: 'Nazwa jest wymagana' }),
      });

      await expect(createProject({ name: '' })).rejects.toThrow('Nazwa jest wymagana');
    });
  });

  describe('getProject', () => {
    it('fetches project by ID', async () => {
      const mockProject = {
        id: 'p1',
        name: 'My Project',
        description: 'desc',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProject),
      });

      const result = await getProject('p1');
      expect(result.name).toBe('My Project');
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/p1');
    });
  });

  describe('listProjects', () => {
    it('returns array of projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          projects: [
            { id: 'p1', name: 'P1', description: null, created_at: '', updated_at: '' },
            { id: 'p2', name: 'P2', description: null, created_at: '', updated_at: '' },
          ],
          total: 2,
        }),
      });

      const result = await listProjects();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('P1');
    });
  });

  describe('deleteProject', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await deleteProject('p1');
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/p1', { method: 'DELETE' });
    });

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Projekt nie istnieje' }),
      });

      await expect(deleteProject('nonexistent')).rejects.toThrow('Projekt nie istnieje');
    });
  });
});
