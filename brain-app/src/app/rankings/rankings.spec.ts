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
        {
          id: '1',
          category_id: 'c',
          name: 'B',
          rating: 5,
          priority: 1,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: '2',
          category_id: 'c',
          name: 'A',
          rating: 9,
          priority: 2,
          created_at: '2026-02-01T00:00:00Z',
        },
      ],
      history: [],
    });
    await TestBed.configureTestingModule({
      imports: [Rankings],
      providers: [provideRouter([]), { provide: RankingsService, useValue: service }],
    }).compileComponents();
  });
  it('sorts newly added rankings first by default', async () => {
    const f = TestBed.createComponent(Rankings);
    await f.whenStable();
    expect(f.componentInstance.sort()).toBe('created_at');
    expect(f.componentInstance.visible().map((x) => x.id)).toEqual(['2', '1']);
  });
  it('toggles between descending and ascending order', async () => {
    const f = TestBed.createComponent(Rankings);
    await f.whenStable();
    expect(f.componentInstance.visible().map((x) => x.id)).toEqual(['2', '1']);
    f.componentInstance.toggleSortDirection();
    expect(f.componentInstance.visible().map((x) => x.id)).toEqual(['1', '2']);
    expect(f.componentInstance.visibleLimit()).toBe(24);
  });
  it('sorts by year and consumed date', async () => {
    const f = TestBed.createComponent(Rankings);
    await f.whenStable();
    f.componentInstance.items.update((items) =>
      items.map((item, index) => ({
        ...item,
        year: 2000 + index,
        consumed_at: `2026-0${index + 1}-01`,
      })),
    );
    f.componentInstance.sort.set('year');
    expect(f.componentInstance.visible()[0].year).toBe(2001);
    f.componentInstance.sort.set('consumed_at');
    expect(f.componentInstance.visible()[0].consumed_at).toBe('2026-02-01');
  });
  it('shows 24 rankings initially and loads another page', async () => {
    const f = TestBed.createComponent(Rankings);
    await f.whenStable();
    f.componentInstance.items.set(
      Array.from(
        { length: 30 },
        (_, i) =>
          ({
            id: `${i}`,
            category_id: 'c',
            name: `Item ${i}`,
            created_at: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
          }) as any,
      ),
    );
    expect(f.componentInstance.displayed()).toHaveLength(24);
    expect(f.componentInstance.remaining()).toBe(6);
    f.componentInstance.loadMore();
    expect(f.componentInstance.displayed()).toHaveLength(30);
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
  it('renders ratings as ten filled or empty stars', () => {
    const f = TestBed.createComponent(Rankings);
    expect(f.componentInstance.stars(7).filter(Boolean)).toHaveLength(7);
    expect(f.componentInstance.stars(7)).toHaveLength(10);
  });
  it('provides badges for Dran and Geplant statuses', () => {
    const f = TestBed.createComponent(Rankings);
    expect(f.componentInstance.statusBadge('current')).toBe('Dran');
    expect(f.componentInstance.statusBadge('planned')).toBe('Geplant');
    expect(f.componentInstance.statusBadge('done')).toBeNull();
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
