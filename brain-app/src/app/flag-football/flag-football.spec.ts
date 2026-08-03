import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlagFootballService } from './flag-football.service';
import { FlagFootball } from './flag-football';
describe('FlagFootball', () => {
  const formation = {
    id: 'f',
    user_id: 'u',
    name: 'Trips',
    players: [{ id: 'p', label: 'WR', x: 20, y: 70 }],
  };
  const route = {
    id: 'r',
    user_id: 'u',
    name: 'Go',
    aliases: ['Fly'],
    segments: [
      { x: 20, y: 70 },
      { x: 20, y: 10 },
    ],
  };
  const play = {
    id: 'p1',
    user_id: 'u',
    name: 'Trips Go',
    formation_id: 'f',
    assignments: [{ player_id: 'p', route_id: 'r' }],
  };
  const entries = [
    { id: 'e1', user_id: 'u', play_id: 'p1', position: 0, flipped: false },
    { id: 'e2', user_id: 'u', play_id: 'p2', position: 1, flipped: false },
  ];
  const service = { load: vi.fn(), save: vi.fn(), remove: vi.fn(), reorder: vi.fn() };
  beforeEach(async () => {
    vi.clearAllMocks();
    service.load.mockResolvedValue({
      formations: [formation],
      routes: [route],
      plays: [play, { ...play, id: 'p2', name: 'Second' }],
      playbook: entries,
    });
    await TestBed.configureTestingModule({
      imports: [FlagFootball],
      providers: [provideRouter([]), { provide: FlagFootballService, useValue: service }],
    }).compileComponents();
  });
  it('flips coordinates deterministically without mutating originals', async () => {
    const f = TestBed.createComponent(FlagFootball);
    await f.whenStable();
    const original = f.componentInstance.players();
    const once = f.componentInstance.flipPlayers(original);
    const twice = f.componentInstance.flipPlayers(once);
    expect(once[2].x).toBe(80);
    expect(twice).toEqual(original);
    expect(f.componentInstance.flipRoute(f.componentInstance.flipRoute())).toEqual(
      f.componentInstance.routePoints(),
    );
  });
  it('creates assignments and prevents duplicate playbook entries', async () => {
    const f = TestBed.createComponent(FlagFootball);
    await f.whenStable();
    f.componentInstance.setAssignment('p', 'r');
    expect(f.componentInstance.assignments()).toEqual([{ player_id: 'p', route_id: 'r' }]);
    await f.componentInstance.addToPlaybook(play);
    expect(service.save).not.toHaveBeenCalled();
    expect(f.componentInstance.error()).toContain('bereits');
  });
  it('persists playbook ordering and numbering', async () => {
    const f = TestBed.createComponent(FlagFootball);
    await f.whenStable();
    await f.componentInstance.move(entries[1], -1);
    expect(f.componentInstance.playbook().map((x) => x.id)).toEqual(['e2', 'e1']);
    expect(f.componentInstance.playbook().map((x) => x.position)).toEqual([0, 1]);
    expect(service.reorder).toHaveBeenCalled();
  });
  it('saves formations, routes, and plays', async () => {
    const f = TestBed.createComponent(FlagFootball);
    await f.whenStable();
    f.componentInstance.name.set('New');
    await f.componentInstance.addFormation();
    expect(service.save).toHaveBeenCalledWith(
      'flag_football_formations',
      expect.objectContaining({ name: 'New' }),
    );
    f.componentInstance.name.set('Go');
    await f.componentInstance.addRoute();
    expect(service.save).toHaveBeenCalledWith(
      'flag_football_routes',
      expect.objectContaining({ segments: expect.any(Array) }),
    );
    f.componentInstance.name.set('Play');
    await f.componentInstance.addPlay();
    expect(service.save).toHaveBeenCalledWith(
      'flag_football_plays',
      expect.objectContaining({ formation_id: 'f' }),
    );
  });
  it('shows load errors', async () => {
    service.load.mockRejectedValueOnce(new Error('Fehler'));
    const f = TestBed.createComponent(FlagFootball);
    await f.whenStable();
    expect(f.componentInstance.error()).toBe('Fehler');
  });
});
