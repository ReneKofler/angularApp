import { expect, test } from '@playwright/test';
import { signIn } from './helpers';
test.beforeEach(async({page})=>signIn(page));
test('loads the recipe library and search',async({page})=>{
  await page.goto('/recipes');
  await expect(page.getByRole('heading',{name:'Rezepte'})).toBeVisible();
  await expect(page.getByLabel('Rezepte suchen')).toBeVisible();
  await expect(page.getByRole('button',{name:'+ Rezept'})).toBeVisible();
});
test('opens and cancels recipe creation without writing data',async({page})=>{
  await page.goto('/recipes');await page.getByRole('button',{name:'+ Rezept'}).click();
  await expect(page.getByRole('heading',{name:'Rezept erstellen'})).toBeVisible();
  await page.getByRole('button',{name:'Abbrechen'}).click();
  await expect(page.getByLabel('Rezepte suchen')).toBeVisible();
});
