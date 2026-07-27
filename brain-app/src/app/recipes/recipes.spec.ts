import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Recipes } from './recipes';
import { RecipesService } from './recipes.service';

describe('Recipes', () => {
  const recipes = [
    { id:'1',user_id:'u',name:'Protein Bowl',ingredients:'Reis, Tofu',preparation:'Mischen',
      calories:500,protein:35,carbs:60,fat:12,fiber:8,salt:1,servings:2,prep_time:20,rating:5,
      image_url:null,meal_prep:true,tips:null,is_favourite:true },
    { id:'2',user_id:'u',name:'Pasta',ingredients:'Nudeln',preparation:'Kochen',
      calories:null,protein:null,carbs:null,fat:null,fiber:null,salt:null,servings:null,prep_time:null,
      rating:null,image_url:null,meal_prep:false,tips:null,is_favourite:false },
  ];
  const service = { load:vi.fn().mockResolvedValue(recipes),save:vi.fn(),toggleFavourite:vi.fn(),delete:vi.fn() };
  beforeEach(async()=>{vi.clearAllMocks();await TestBed.configureTestingModule({
    imports:[Recipes],providers:[provideRouter([]),{provide:RecipesService,useValue:service}],
  }).compileComponents();});
  it('searches ingredients and filters meal-prep recipes',async()=>{
    const fixture=TestBed.createComponent(Recipes);await fixture.whenStable();
    fixture.componentInstance.query.set('tofu');expect(fixture.componentInstance.filtered()).toHaveLength(1);
    fixture.componentInstance.query.set('');fixture.componentInstance.filter.set('meal-prep');
    expect(fixture.componentInstance.filtered().map(item=>item.name)).toEqual(['Protein Bowl']);
  });
  it('renders fallbacks for optional fields',async()=>{
    const fixture=TestBed.createComponent(Recipes);await fixture.whenStable();
    fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Keine Zeitangabe');
  });
  it('validates required recipe details',async()=>{
    const fixture=TestBed.createComponent(Recipes);await fixture.whenStable();
    fixture.componentInstance.newRecipe();await fixture.componentInstance.save();
    expect(service.save).not.toHaveBeenCalled();expect(fixture.componentInstance.error()).toContain('erforderlich');
  });
  it('toggles favourites through the service',async()=>{
    const fixture=TestBed.createComponent(Recipes);await fixture.whenStable();
    await fixture.componentInstance.favourite(recipes[0]);
    expect(service.toggleFavourite).toHaveBeenCalledWith(recipes[0]);
  });
});
