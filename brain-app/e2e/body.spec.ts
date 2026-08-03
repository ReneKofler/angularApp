import {expect,test} from '@playwright/test';
import {signIn} from './helpers';
test.beforeEach(async({page})=>signIn(page));
test('loads body progress and opens each editor',async({page})=>{
  await page.goto('/body');await expect(page.getByRole('heading',{name:'Körper'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Verlauf',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'+ Messung'}).click();await expect(page.getByRole('heading',{name:'Messung hinzufügen'})).toBeVisible();await page.getByRole('button',{name:'Abbrechen'}).click();
  await page.getByRole('button',{name:'Einstellungen'}).click();await expect(page.getByRole('heading',{name:'Sichtbarkeit & Profil'})).toBeVisible();
  await page.getByRole('button',{name:'Zielwerte bearbeiten'}).click();await expect(page.getByRole('heading',{name:'Ziele ändern'})).toBeVisible();
});
