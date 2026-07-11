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

  test('book catalog separates reader labels from operational metadata', async ({ page }) => {
    await page.goto(sitePath('/books/'));
    const cards = page.locator('[data-book-card]');
    for (const internalValue of [
      'published', 'planned', 'archived', 'main-lineup', 'related-independent',
      'full-public', 'free-preview', 'public', 'private', 'not-created',
      'beginner', 'junior', 'intermediate', 'advanced', 'all-levels', 'ja', 'en'
    ]) {
      await expect(cards.getByText(internalValue, { exact: true })).toHaveCount(0);
    }
    await expect(cards.getByText('暫定割当（要確認）', { exact: true })).toHaveCount(0);
    await expect(cards.getByText('日本語個別概要はREADME公開カタログ上で未記載。', { exact: true })).toHaveCount(0);

    const wslCard = page.locator('#wsl2-linux-essentials-book').locator('..');
    const prerequisite = wslCard.getByRole('link', { name: '図解でわかるLinux基礎', exact: true });
    await expect(prerequisite).toHaveAttribute('href', '#illustrated-linux-basics-book');
    await expect(wslCard).not.toContainText('illustrated-linux-basics-book');

    await expect(page.locator('#ai-agent-collaboration-book').locator('..')).toContainText('管理リポジトリは非公開');
    await expect(page.locator('[data-book-card][data-status="planned"]').first()).toContainText('計画中の書籍です');
    await expect(page.locator('#composable-software-design-book').locator('..')).toContainText('独立した英語書籍です');
  });

  test('book catalog reports an empty result and resets all filters', async ({ page }) => {
    await page.goto(sitePath('/books/'));
    const keyword = page.locator('#book-filter-keyword');
    const empty = page.locator('#book-filter-empty');

    await keyword.fill('__no_catalog_match__');
    await expect(page.locator('[data-book-card]:visible')).toHaveCount(0);
    await expect(page.locator('#book-filter-result')).toContainText('0 / 49 件');
    await expect(empty).toBeVisible();

    await page.locator('#book-filter-reset').click();
    await expect(keyword).toHaveValue('');
    await expect(keyword).toBeFocused();
    await expect(page.locator('[data-book-card]:visible')).toHaveCount(49);
    await expect(page.locator('#book-filter-result')).toContainText('49 / 49 件');
    await expect(empty).toBeHidden();
  });

  test('search data can use a catalog ID without displaying it as a reader label', async ({ page }) => {
    await page.goto(sitePath('/books/'));
    await page.locator('#book-filter-keyword').fill('wsl2-linux-essentials-book');
    const visibleCard = page.locator('[data-book-card]:visible');
    await expect(visibleCard).toHaveCount(1);
    await expect(visibleCard).toContainText('WSL2 Linux実践ガイド');
    await expect(visibleCard).not.toContainText('wsl2-linux-essentials-book');
  });

  test('book catalog remains fully visible without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${baseURL}${sitePath('/books/')}`);
    await expect(page.locator('[data-book-card]')).toHaveCount(49);
    await expect(page.locator('[data-book-card]').first()).toBeVisible();
    await expect(page.locator('#book-filter-empty')).toBeHidden();
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
