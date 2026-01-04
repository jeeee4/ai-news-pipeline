import { describe, it, expect } from "vitest";
import { parseRSS, parseAtom, parseDate } from "./rss.js";

describe("RSS Parser", () => {
  describe("parseRSS", () => {
    it("should parse RSS 2.0 feed correctly", () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <item>
              <title>Test Article 1</title>
              <link>https://example.com/article1</link>
              <description>Article description</description>
              <pubDate>Mon, 01 Jan 2024 10:00:00 +0900</pubDate>
              <author>test@example.com</author>
              <guid>article-1</guid>
            </item>
            <item>
              <title>Test Article 2</title>
              <link>https://example.com/article2</link>
              <description>Another description</description>
              <pubDate>Tue, 02 Jan 2024 12:00:00 +0900</pubDate>
            </item>
          </channel>
        </rss>`;

      const items = parseRSS(rssXml);

      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        title: "Test Article 1",
        link: "https://example.com/article1",
        description: "Article description",
        author: "test@example.com",
        guid: "article-1",
      });
      expect(items[1]).toMatchObject({
        title: "Test Article 2",
        link: "https://example.com/article2",
      });
    });

    it("should handle empty feed", () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Empty Feed</title>
          </channel>
        </rss>`;

      const items = parseRSS(rssXml);
      expect(items).toHaveLength(0);
    });

    it("should handle dc:creator as author", () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <channel>
            <item>
              <title>Test</title>
              <dc:creator>John Doe</dc:creator>
            </item>
          </channel>
        </rss>`;

      const items = parseRSS(rssXml);
      expect(items[0].author).toBe("John Doe");
    });
  });

  describe("parseAtom", () => {
    it("should parse Atom feed correctly", () => {
      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Test Atom Feed</title>
          <entry>
            <id>tag:example.com,2024:article-1</id>
            <title>Atom Article 1</title>
            <link rel="alternate" href="https://example.com/atom-article1"/>
            <published>2024-01-01T10:00:00+09:00</published>
            <updated>2024-01-01T12:00:00+09:00</updated>
            <author>
              <name>Test Author</name>
            </author>
            <content>Article content here</content>
          </entry>
        </feed>`;

      const entries = parseAtom(atomXml);

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        id: "tag:example.com,2024:article-1",
        title: "Atom Article 1",
        published: "2024-01-01T10:00:00+09:00",
        content: "Article content here",
      });
      expect(entries[0].link).toEqual({ href: "https://example.com/atom-article1" });
      expect(entries[0].author?.name).toBe("Test Author");
    });

    it("should handle multiple entries", () => {
      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry><title>Entry 1</title></entry>
          <entry><title>Entry 2</title></entry>
          <entry><title>Entry 3</title></entry>
        </feed>`;

      const entries = parseAtom(atomXml);
      expect(entries).toHaveLength(3);
    });

    it("should use summary when content is not available", () => {
      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Entry with summary</title>
            <summary>This is a summary</summary>
          </entry>
        </feed>`;

      const entries = parseAtom(atomXml);
      expect(entries[0].summary).toBe("This is a summary");
    });
  });

  describe("parseDate", () => {
    it("should parse valid date string", () => {
      const date = parseDate("2024-01-15T10:30:00Z");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });

    it("should return current date for undefined", () => {
      const before = new Date();
      const date = parseDate(undefined);
      const after = new Date();

      expect(date.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should return current date for invalid date string", () => {
      const before = new Date();
      const date = parseDate("not a valid date");
      const after = new Date();

      expect(date.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should parse RFC 822 format", () => {
      const date = parseDate("Mon, 01 Jan 2024 10:00:00 +0900");
      expect(date.getFullYear()).toBe(2024);
    });
  });
});
