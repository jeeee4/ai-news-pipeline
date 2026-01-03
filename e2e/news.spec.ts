import { test, expect } from "@playwright/test";

test.describe("AI News Page", () => {
  test("should display the news list page", async ({ page }) => {
    await page.goto("/");

    // ページタイトルを確認
    await expect(page).toHaveTitle(/AI News/);

    // ニュース一覧が表示されていることを確認
    await expect(page.locator("h1")).toContainText("AI News");
  });

  test("should display news items with required information", async ({
    page,
  }) => {
    await page.goto("/");

    // ニュースアイテムが存在することを確認
    const newsItems = page.locator("[data-testid='news-item']");
    await expect(newsItems.first()).toBeVisible();

    // 各アイテムにタイトル、スコア、日付があることを確認
    const firstItem = newsItems.first();
    await expect(firstItem.locator("[data-testid='news-title']")).toBeVisible();
    await expect(firstItem.locator("[data-testid='news-score']")).toBeVisible();
    await expect(firstItem.locator("[data-testid='news-date']")).toBeVisible();
  });

  test("should navigate to article detail page", async ({ page }) => {
    await page.goto("/");

    // 最初の記事をクリック
    const firstNewsItem = page.locator("[data-testid='news-item']").first();
    await firstNewsItem.click();

    // 詳細ページに遷移したことを確認
    await expect(page).toHaveURL(/\/news\/\d+/);

    // 要約が表示されていることを確認
    await expect(page.locator("[data-testid='news-summary']")).toBeVisible();
  });

  test("should filter news by search query", async ({ page }) => {
    await page.goto("/");

    // 検索ボックスに入力
    const searchInput = page.locator("[data-testid='search-input']");
    await searchInput.fill("OpenAI");

    // フィルタリングされた結果を確認
    const newsItems = page.locator("[data-testid='news-item']");
    const count = await newsItems.count();

    // すべてのアイテムにOpenAIが含まれていることを確認
    for (let i = 0; i < count; i++) {
      const title = await newsItems.nth(i).locator("[data-testid='news-title']").textContent();
      expect(title?.toLowerCase()).toContain("openai");
    }
  });
});
