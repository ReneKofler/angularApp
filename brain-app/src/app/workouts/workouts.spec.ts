import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Workouts } from './workouts';
import { Workout, WorkoutsService } from './workouts.service';

describe('Workouts',()=>{
  const workout:Workout={id:'w1',user_id:'u1',sport_type_id:null,sport_name:'Running',performed_at:'2026-07-20',distance:5,duration_minutes:25,average_heart_rate:150,elevation_gain:40,reps:null,stationary:false,notes:'Tempo'};
  const service={load:vi.fn().mockResolvedValue({workouts:[workout],sportTypes:[],stats:[],records:[]}),saveWorkout:vi.fn().mockResolvedValue(workout),deleteWorkout:vi.fn(),saveSportType:vi.fn(),deleteSportType:vi.fn(),saveRecord:vi.fn(),deleteRecord:vi.fn()};
  beforeEach(async()=>{vi.clearAllMocks();await TestBed.configureTestingModule({imports:[Workouts],providers:[provideRouter([]),{provide:WorkoutsService,useValue:service}]}).compileComponents();});
  it('filters workouts and calculates totals and pace',async()=>{
    const fixture=TestBed.createComponent(Workouts);await fixture.whenStable();const component=fixture.componentInstance;
    expect(component.totalDistance()).toBe(5);expect(component.totalMinutes()).toBe(25);expect(component.pace(workout)).toBe('5:00 min/km');
    component.query.set('cycling');expect(component.filteredWorkouts()).toHaveLength(0);
  });
  it('validates metrics and saves only supported fields',async()=>{
    const fixture=TestBed.createComponent(Workouts);await fixture.whenStable();const component=fixture.componentInstance;
    component.newWorkout();await component.save();expect(service.saveWorkout).not.toHaveBeenCalled();
    component.distance.set(10);component.duration.set(50);component.reps.set(99);await component.save();
    expect(service.saveWorkout).toHaveBeenCalledWith(expect.objectContaining({distance:10,duration_minutes:50,reps:null,sport_name:'Running'}),undefined);
  });
});
