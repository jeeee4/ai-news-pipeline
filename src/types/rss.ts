export interface RSSFeedItem {
  title: string;
  link: string;
  description: string | null;
  pubDate: Date;
  guid: string;
  categories: string[];
}

export interface RSSFeed {
  title: string;
  description: string | null;
  link: string;
  items: RSSFeedItem[];
}

export interface BlogSource {
  id: string;
  name: string;
  feedUrl: string;
  siteUrl: string;
}

export interface BlogNewsItem {
  id: string;
  title: string;
  url: string;
  description: string | null;
  source: string;
  postedAt: Date;
}
