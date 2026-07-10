import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const basePath = '/it-engineer-knowledge-architecture';
const sitePath = (path) => `${basePath}${path}`;

const pages = [
  { path: '/', title: 'ITエンジニア知識アーキテクチャ' },
  { path: '/books/', title: '書籍一覧' },
  { path: '/paths/', title: '学習パス' },
  { path: '/en/', title: 'English Catalog' },
  { path: '/404.html', title: 'ページが見つかりません' }
];

test.describe('site structure and accessibility', () => {
  for (const target of pages) {
    test(`${target.path} has one h1, landmarks, and no axe violations`, async ({ page }) => {
      await page.goto(sitePath(target.path));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText(target.title);
      await expect(page.locator('header')).toHaveCount(1);
      await expect(page.locator('nav[aria-label="主要ナビゲーション"]')).toHaveCount(1);
      await expect(page.locator('main#main-content')).toHaveCount(1);
      await expect(page.locator('footer')).toHaveCount(1);

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('skip link becomes visible on keyboard focus', async ({ page }) => {
    await page.goto(sitePath('/'));
    const skipLink = page.locator('a.skip-link');
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await skipLink.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('Japanese and English entry links work under the Pages base path', async ({ page }) => {
    await page.goto(sitePath('/'));
    await page.getByRole('navigation', { name: '主要ナビゲーション' }).getByRole('link', { name: 'English', exact: true }).click();
    await expect(page).toHaveURL(/\/it-engineer-knowledge-architecture\/en\/$/);
    await expect(page.locator('h1')).toContainText('English Catalog');

    await page.getByRole('navigation', { name: '主要ナビゲーション' }).getByRole('link', { name: 'ホーム', exact: true }).click();
    await expect(page).toHaveURL(/\/it-engineer-knowledge-architecture\/$/);
    await expect(page.locator('h1')).toContainText('ITエンジニア知識アーキテクチャ');
  });
});

test.describe('catalog interactions', () => {
  test('book catalog renders all records and filters progressively', async ({ page }) => {
    await page.goto(sitePath('/books/'));
    await expect(page.locator('[data-book-card]')).toHaveCount(49);
    await expect(page.locator('#book-filter-result')).toContainText('全 49 件');

    await page.locator('#book-filter-keyword').fill('Kubernetes');
    await expect(page.locator('[data-book-card]:visible')).toHaveCount(3);
    await expect(page.locator('#book-filter-result')).toContainText('3 / 49 件');

    await page.locator('#book-filter-keyword').fill('');
    await page.locator('#book-filter-scope').selectOption('free-preview');
    await expect(page.locator('[data-book-card]:visible')).toHaveCount(1);
    await expect(page.locator('[data-book-card]:visible')).toContainText('AIエージェント協働の仕事術');
  });

  test('book catalog remains fully visible without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${baseURL}${sitePath('/books/')}`);
    await expect(page.locator('[data-book-card]')).toHaveCount(49);
    await expect(page.locator('[data-book-card]').first()).toBeVisible();
    await context.close();
  });

  test('learning paths link to catalog anchors', async ({ page }) => {
    await page.goto(sitePath('/paths/'));
    await expect(page.locator('.path-card')).toHaveCount(7);
    const firstCatalogLink = page.locator('.path-card').first().getByRole('link', { name: 'catalog' }).first();
    await firstCatalogLink.click();
    await expect(page).toHaveURL(/\/books\/#illustrated-linux-basics-book$/);
    await expect(page.locator('#illustrated-linux-basics-book')).toBeVisible();
  });
});
