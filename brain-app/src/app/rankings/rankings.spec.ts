import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Rankings } from './rankings';
import { RankingsService } from './rankings.service';
describe('Rankings', () => {
  const service = {
    load: vi.fn(),
    saveRanking: vi.fn(),
    removeRanking: vi.fn(),
    saveCategory: vi.fn(),
    consume: vi.fn(),
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    service.load.mockResolvedValue({
      categories: [{ id: 'c', name: 'Filme', position: 0 }],
      rankings: [
        { id: '1', category_id: 'c', name: 'B', rating: 5, priority: 1 },
        { id: '2', category_id: 'c', name: 'A', rating: 9, priority: 2 },
      ],
      history: [],
    });
    await TestBed.configureTestingModule({
      imports: [Rankings],
      providers: [provideRouter([]), { provide: RankingsService, useValue: service }],
    }).compileComponents();
  });
  it('filters and sorts category entries', async () => {
    const f = TestBed.createComponent(Rankings);
    await f.whenStable();
    f.componentInstance.query.set('a');
    expect(f.componentInstance.visible().map((x) => x.name)).toEqual(['A']);
  });
  it('calculates bounded episode progress', async () => {
    const f = TestBed.createComponent(Rankings);
    expect(f.componentInstance.progress({ episodes: 10, watched_episodes: 12 } as any)).toBe(100);
  });
  it('maps persisted gradient tokens to valid CSS', () => {
    const f = TestBed.createComponent(Rankings);
    expect(f.componentInstance.categoryBackground('from-amber-500 to-amber-600')).toContain(
      'linear-gradient',
    );
    expect(f.componentInstance.categoryBackground('#123456')).toBe('#123456');
  });
  it('records consumption with today date', async () => {
    const f = TestBed.createComponent(Rankings);
    await f.componentInstance.consume({ id: '1' } as any);
    expect(service.consume).toHaveBeenCalledWith('1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });
});
