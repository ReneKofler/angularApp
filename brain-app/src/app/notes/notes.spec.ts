import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Notes } from './notes';
import { Note, NotesService } from './notes.service';

describe('Notes', () => {
  const note: Note = { id:'note-1', user_id:'user-1', title:'Release plan', content:'Ship the notes feature',
    tags:['work'], done:false, list_id:'list-1', position:0, reminder_date:'2026-07-21', mode:'text', priority:'high' };
  const service = { load:vi.fn().mockResolvedValue({notes:[note],lists:[{id:'list-1',user_id:'user-1',name:'Todos',position:0}]}), saveNote:vi.fn().mockResolvedValue(note),
    deleteNote:vi.fn().mockResolvedValue(undefined), saveList:vi.fn(), deleteList:vi.fn() };
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({ imports:[Notes], providers:[provideRouter([]),{provide:NotesService,useValue:service}] }).compileComponents();
  });
  it('loads and filters notes by content, status, and priority', async () => {
    const fixture=TestBed.createComponent(Notes); await fixture.whenStable(); const component=fixture.componentInstance;
    expect(component.filteredNotes()).toHaveLength(1); component.query.set('missing'); expect(component.filteredNotes()).toHaveLength(0);
    component.query.set('ship'); component.statusFilter.set('done'); expect(component.filteredNotes()).toHaveLength(0);
    component.statusFilter.set('open'); component.priorityFilter.set('high'); expect(component.filteredNotes()).toHaveLength(1);
  });
  it('renders category labels, note titles, and note content', async () => {
    const fixture=TestBed.createComponent(Notes); await fixture.whenStable(); fixture.detectChanges();
    const text=fixture.nativeElement.textContent;
    expect(text).toContain('Todos'); expect(text).toContain('Release plan'); expect(text).toContain('Ship the notes feature');
  });
  it('normalizes tags and saves a new note', async () => {
    const fixture=TestBed.createComponent(Notes); await fixture.whenStable(); const component=fixture.componentInstance;
    component.newNote(); component.title.set('Idea'); component.tags.set('work, idea, work'); await component.save();
    expect(service.saveNote).toHaveBeenCalledWith(expect.objectContaining({title:'Idea',tags:['work','idea']}),undefined);
  });
});
