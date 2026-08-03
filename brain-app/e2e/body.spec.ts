import {expect,test} from '@playwright/test';
import {signIn} from './helpers';
test.beforeEach(async({page})=>signIn(page));
test('loads body progress and opens each editor',async({page})=>{
  await page.goto('/body');await expect(page.getByRole('heading',{name:'Körper'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Verlauf',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'+ Messung'}).click();await expect(page.getByRole('heading',{name:'Neue Messung'})).toBeVisible();await expect(page.getByLabel('BMI ⓘ')).toContainText('–');await page.getByRole('button',{name:'Abbrechen'}).click();
  await page.getByRole('button',{name:'Einstellungen'}).click();await expect(page.getByRole('heading',{name:'Sichtbarkeit & Profil'})).toBeVisible();
  await page.getByRole('button',{name:'Zielwerte bearbeiten'}).click();await expect(page.getByRole('heading',{name:'Ziele ändern'})).toBeVisible();
});

test('creates and removes a measurement through the inline form',async({page})=>{
  let measurements:any[]=[];
  await page.route('**/rest/v1/body_measurements**',async route=>{
    const method=route.request().method();
    if(method==='GET'){await route.fulfill({json:measurements});return}
    if(method==='POST'){const draft=route.request().postDataJSON();const item={...draft,id:'e2e-measurement',created_at:new Date().toISOString()};measurements=[item];await route.fulfill({status:201,json:item});return}
    if(method==='DELETE'){measurements=[];await route.fulfill({status:204,body:''});return}
    await route.continue();
  });
  await page.route('**/rest/v1/body_goals**',route=>route.fulfill({json:{goal_weight_kg:null,goal_body_fat_percent:null}}));
  await page.route('**/rest/v1/body_goal_history**',route=>route.fulfill({json:[]}));
  await page.route('**/rest/v1/body_milestones**',route=>route.fulfill({json:[]}));
  await page.route('**/rest/v1/user_settings**',route=>route.fulfill({json:{body_fat_visible:true,body_height_cm:180}}));
  await page.goto('/body');
  await page.getByRole('button',{name:'+ Messung'}).click();
  await page.getByLabel('Gewicht (kg)').fill('81.2');
  await page.getByRole('button',{name:'Messung speichern'}).click();
  const row=page.getByRole('button',{name:/81\.2 kg/});
  await expect(row).toBeVisible();
  await row.click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Löschen'}).click();
  await expect(row).toBeHidden();
});
