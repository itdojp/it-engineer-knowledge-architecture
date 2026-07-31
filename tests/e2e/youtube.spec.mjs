import { test, expect } from '@playwright/test';

import catalog from '../../docs/_data/catalog.json' with { type: 'json' };
import youtube from '../../docs/_data/youtube.json' with { type: 'json' };

const basePath = '/it-engineer-knowledge-architecture';
const sitePath = (path) => `${basePath}${path}`;

test.describe('YouTube introduction links', () => {
  test('Japanese and English entry pages expose the localized overview, playlist, and channel', async ({ page }) => {
    await page.goto(sitePath('/'));
    await expect(page.locator('[data-series-video][data-video-language="ja"]')).toHaveAttribute('href', youtube.meta.seriesOverview.ja.url);
    await expect(page.locator('[data-youtube-playlist][data-video-language="ja"]')).toHaveAttribute('href', youtube.meta.playlists.ja.url);
    await expect(page.locator('[data-youtube-channel]')).toHaveAttribute('href', youtube.meta.channel.url);

    await page.goto(sitePath('/en/'));
    await expect(page.locator('[data-series-video][data-video-language="en"]')).toHaveAttribute('href', youtube.meta.seriesOverview.en.url);
    await expect(page.locator('[data-youtube-playlist][data-video-language="en"]')).toHaveAttribute('href', youtube.meta.playlists.en.url);
    await expect(page.locator('[data-youtube-channel]')).toHaveAttribute('href', youtube.meta.channel.url);
  });

  test('every published catalog card exposes the matching Japanese and English introduction videos', async ({ page }) => {
    await page.goto(sitePath('/books/'));
    const japaneseUrls = await page.locator('[data-book-video][data-video-language="ja"]').evaluateAll(
      (links) => links.map((link) => link.getAttribute('href'))
    );
    const englishUrls = await page.locator('[data-book-video][data-video-language="en"]').evaluateAll(
      (links) => links.map((link) => link.getAttribute('href'))
    );
    expect(japaneseUrls).toEqual(youtube.books.map((book) => book.video_ja_url));
    expect(englishUrls).toEqual(youtube.books.map((book) => book.video_en_url));
  });

  test('English catalog exposes both localized videos for the same published set', async ({ page }) => {
    await page.goto(sitePath('/en/'));
    const englishUrls = await page.locator('[data-book-video][data-video-language="en"]').evaluateAll(
      (links) => links.map((link) => link.getAttribute('href'))
    );
    const japaneseUrls = await page.locator('[data-book-video][data-video-language="ja"]').evaluateAll(
      (links) => links.map((link) => link.getAttribute('href'))
    );
    expect(englishUrls).toEqual(youtube.books.map((book) => book.video_en_url));
    expect(japaneseUrls).toEqual(youtube.books.map((book) => book.video_ja_url));
  });

  test('planned books remain visible without fabricated video links', async ({ page }) => {
    const plannedIds = catalog.books.filter((book) => book.status === 'planned').map((book) => book.id);
    expect(plannedIds).toEqual(youtube.meta.booksWithoutVideo.map((book) => book.id));

    await page.goto(sitePath('/books/'));
    for (const bookId of plannedIds) {
      await expect(page.locator(`#${bookId}`).locator('..').locator('[data-book-video]')).toHaveCount(0);
    }

    await page.goto(sitePath('/en/'));
    for (const bookId of plannedIds) {
      await expect(page.locator(`[data-catalog-id="${bookId}"]`).locator('[data-book-video]')).toHaveCount(0);
    }
  });
});
