import {expect,test} from '@playwright/test';import {signIn} from './helpers';test.beforeEach(async({page})=>signIn(page));
test('manages lists, items, completion and sharing without writing real data',async({page})=>{
 let lists:any[]=[],items:any[]=[];
 await page.route('**/rest/v1/grocery_lists**',async r=>{const m=r.request().method();if(m==='GET'){await r.fulfill({json:lists});return}if(m==='POST'){const x=r.request().postDataJSON();lists=[...lists,{...x,id:'l2',created_at:'2026-08-03'}]}await r.fulfill({status:201,json:{}})});
 await page.route('**/rest/v1/grocery_items**',async r=>{const m=r.request().method(),x=r.request().postDataJSON();if(m==='GET'){await r.fulfill({json:items});return}if(m==='POST')items=[...items,{...x,id:'i1',is_completed:false,created_at:'2026-08-03',completed_at:null}];if(m==='PATCH')items=items.map(i=>({...i,is_completed:true,completed_at:new Date().toISOString()}));await r.fulfill({status:201,json:{}})});
 await page.route('**/rest/v1/grocery_list_shares**',r=>r.request().method()==='GET'?r.fulfill({json:[]}):r.fulfill({status:201,json:{}}));
 await page.goto('/groceries');await expect(page.getByRole('heading',{name:'Einkaufslisten'})).toBeVisible();
 await page.getByLabel('Listenname').fill('Party');await page.getByRole('button',{name:'Neue Liste'}).click();await expect(page.getByRole('heading',{name:'Party'})).toBeVisible();
 await page.getByLabel('Artikel für Party').fill('Chips');await page.getByLabel('Artikel für Party').press('Enter');await expect(page.getByText('Chips')).toBeVisible();
 await page.getByRole('button',{name:'Chips erledigen'}).click();await expect(page.getByRole('button',{name:'Chips reaktivieren'})).toBeVisible();
 await page.getByRole('button',{name:'Liste teilen'}).click();await expect(page.getByRole('heading',{name:'Liste teilen'})).toBeVisible();
});
