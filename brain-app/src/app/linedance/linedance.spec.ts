import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinedanceService } from './linedance.service';
import { Linedance } from './linedance';
describe('Linedance', () => {
  const dance = {
    id: 'd',
    user_id: 'u',
    name: 'Electric Slide',
    song: 'Electric Boogie',
    artist: 'Marcia Griffiths',
    youtube_url: 'https://youtu.be/test',
    counts: 18,
    walls: 4,
    difficulty: 'Anfänger',
    notes: '',
  };
  const steps = [
    {
      id: '1',
      user_id: 'u',
      dance_id: 'd',
      position: 0,
      counts: '1-4',
      instruction: 'Grapevine rechts',
      foot: 'Rechts',
      annotation: 'Gewicht rechts',
    },
    {
      id: '2',
      user_id: 'u',
      dance_id: 'd',
      position: 1,
      counts: '5-8',
      instruction: 'Grapevine links',
      foot: 'Links',
      annotation: '',
    },
  ];
  const service = {
    load: vi.fn(),
    saveDance: vi.fn(),
    deleteDance: vi.fn(),
    saveStep: vi.fn(),
    deleteStep: vi.fn(),
    reorder: vi.fn(),
    safeYoutube: vi.fn((x: string) => x),
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    service.load.mockResolvedValue({ dances: [dance], steps });
    await TestBed.configureTestingModule({
      imports: [Linedance],
      providers: [provideRouter([]), { provide: LinedanceService, useValue: service }],
    }).compileComponents();
  });
  it('loads, searches and selects dances', async () => {
    const f = TestBed.createComponent(Linedance);
    await f.whenStable();
    expect(f.componentInstance.selected()).toBe('d');
    f.componentInstance.query.set('boogie');
    expect(f.componentInstance.visible()).toHaveLength(1);
  });
  it('creates and edits dances with validated URLs', async () => {
    const f = TestBed.createComponent(Linedance);
    await f.whenStable();
    f.componentInstance.patchDance('name', 'Neuer Tanz');
    f.componentInstance.patchDance('youtube_url', 'https://youtu.be/new');
    await f.componentInstance.saveDance();
    expect(service.safeYoutube).toHaveBeenCalled();
    expect(service.saveDance).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Neuer Tanz' }),
      undefined,
    );
    f.componentInstance.editDance(dance);
    f.componentInstance.patchDance('walls', 2);
    await f.componentInstance.saveDance();
    expect(service.saveDance).toHaveBeenLastCalledWith(expect.objectContaining({ walls: 2 }), 'd');
  });
  it('creates, edits and deletes labeled steps', async () => {
    const f = TestBed.createComponent(Linedance);
    await f.whenStable();
    f.componentInstance.patchStep('instruction', 'Kick');
    f.componentInstance.patchStep('foot', 'Rechts');
    await f.componentInstance.saveStep();
    expect(service.saveStep).toHaveBeenCalledWith(
      expect.objectContaining({ position: 2, foot: 'Rechts' }),
      undefined,
    );
    f.componentInstance.editStep(steps[0]);
    f.componentInstance.patchStep('annotation', 'Ferse');
    await f.componentInstance.saveStep();
    expect(service.saveStep).toHaveBeenLastCalledWith(
      expect.objectContaining({ annotation: 'Ferse', position: 0 }),
      '1',
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await f.componentInstance.removeStep(steps[0]);
    expect(service.deleteStep).toHaveBeenCalledWith('1');
  });
  it('reorders without changing step labels', async () => {
    const f = TestBed.createComponent(Linedance);
    await f.whenStable();
    await f.componentInstance.move(steps[1], -1);
    expect(f.componentInstance.danceSteps().map((x) => x.id)).toEqual(['2', '1']);
    expect(f.componentInstance.danceSteps()[1].foot).toBe('Rechts');
    expect(service.reorder).toHaveBeenCalled();
  });
  it('shows load failures', async () => {
    service.load.mockRejectedValueOnce(new Error('Fehler'));
    const f = TestBed.createComponent(Linedance);
    await f.whenStable();
    expect(f.componentInstance.error()).toBe('Fehler');
  });
});
describe('LinedanceService URL safety', () => {
  it('allows only YouTube hosts', () => {
    const service = Object.create(LinedanceService.prototype) as LinedanceService;
    expect(service.safeYoutube('https://youtu.be/abc')).toContain('youtu.be');
    expect(() => service.safeYoutube('https://example.com/video')).toThrow('gültige YouTube-URL');
    expect(service.safeYoutube('')).toBe('');
  });
});
