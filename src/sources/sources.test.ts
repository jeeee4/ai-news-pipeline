import { describe, it, expect, vi, beforeEach } from "vitest";
import { SourceManager } from "./index.js";
import { ITMediaSource } from "./itmedia.js";
import { QiitaSource } from "./qiita.js";
import { HackerNewsSource } from "./hackernews.js";

describe("SourceManager", () => {
  let manager: SourceManager;

  beforeEach(() => {
    manager = new SourceManager();
  });

  describe("listSources", () => {
    it("should list all available sources", () => {
      const sources = manager.listSources();

      expect(sources).toContainEqual({
        name: "Hacker News",
        type: "hackernews",
        language: "en",
        enabled: true,
      });
      expect(sources).toContainEqual({
        name: "ITmedia AI+",
        type: "itmedia",
        language: "ja",
        enabled: true,
      });
      expect(sources).toContainEqual({
        name: "Qiita",
        type: "qiita",
        language: "ja",
        enabled: true,
      });
    });
  });

  describe("getEnabledSources", () => {
    it("should return all enabled sources by default", () => {
      const sources = manager.getEnabledSources();
      expect(sources.length).toBe(3);
    });

    it("should filter by japaneseOnly option", () => {
      const sources = manager.getEnabledSources({ japaneseOnly: true });
      expect(sources.length).toBe(2);
      sources.forEach((source) => {
        expect(source.config.language).toBe("ja");
      });
    });

    it("should filter by englishOnly option", () => {
      const sources = manager.getEnabledSources({ englishOnly: true });
      expect(sources.length).toBe(1);
      expect(sources[0].config.language).toBe("en");
    });

    it("should filter by enabledSources option", () => {
      const sources = manager.getEnabledSources({
        enabledSources: ["qiita", "itmedia"],
      });
      expect(sources.length).toBe(2);
      expect(sources.map((s) => s.config.type)).toContain("qiita");
      expect(sources.map((s) => s.config.type)).toContain("itmedia");
    });
  });
});

describe("ITMediaSource", () => {
  it("should have correct config", () => {
    const source = new ITMediaSource();
    expect(source.config).toEqual({
      name: "ITmedia AI+",
      type: "itmedia",
      language: "ja",
      enabled: true,
    });
  });
});

describe("QiitaSource", () => {
  it("should have correct config", () => {
    const source = new QiitaSource();
    expect(source.config).toEqual({
      name: "Qiita",
      type: "qiita",
      language: "ja",
      enabled: true,
    });
  });
});

describe("HackerNewsSource", () => {
  it("should have correct config", () => {
    const source = new HackerNewsSource();
    expect(source.config).toEqual({
      name: "Hacker News",
      type: "hackernews",
      language: "en",
      enabled: true,
    });
  });
});
