import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {Body} from './body';
import {BodyService} from './body.service';

describe('Body',()=>{
  const measurements=[
    {id:'2',user_id:'u',weight_kg:78,body_fat_percent:null,measurement_date:'2026-08-02'},
    {id:'1',user_id:'u',weight_kg:82,body_fat_percent:20,measurement_date:'2026-07-01'},
  ];
  const service={load:vi.fn().mockResolvedValue({measurements,goal:{goal_weight_kg:75,goal_body_fat_percent:15},history:[],milestones:[],preferences:{body_fat_visible:true,body_height_cm:180}}),saveMeasurement:vi.fn(),deleteMeasurement:vi.fn(),saveGoal:vi.fn(),saveMilestone:vi.fn(),deleteMilestone:vi.fn(),savePreferences:vi.fn()};
  beforeEach(async()=>{vi.clearAllMocks();await TestBed.configureTestingModule({imports:[Body],providers:[provideRouter([]),{provide:BodyService,useValue:service}]}).compileComponents()});
  it('calculates progress from the oldest sparse measurement to the current weight',async()=>{const fixture=TestBed.createComponent(Body);await fixture.whenStable();expect(fixture.componentInstance.weightChange()).toBe(-4);expect(fixture.componentInstance.weightProgress()).toBe(57)});
  it('returns no progress when a goal or baseline is missing',async()=>{const fixture=TestBed.createComponent(Body);await fixture.whenStable();expect(fixture.componentInstance.progress(undefined,78,75)).toBeNull();expect(fixture.componentInstance.progress(80,78,null)).toBeNull()});
  it('records goal changes through the history-aware service operation',async()=>{const fixture=TestBed.createComponent(Body);await fixture.whenStable();fixture.componentInstance.openGoal();fixture.componentInstance.updateGoal('goal_weight_kg',74);await fixture.componentInstance.saveGoal();expect(service.saveGoal).toHaveBeenCalledWith(expect.objectContaining({goal_weight_kg:74}))});
  it('hides body-fat summary when privacy preference is disabled',async()=>{const fixture=TestBed.createComponent(Body);await fixture.whenStable();fixture.componentInstance.preferences.set({body_fat_visible:false,body_height_cm:null});fixture.detectChanges();expect(fixture.nativeElement.textContent).not.toContain('Körperfett')});
});
