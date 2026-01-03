export interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  time: number;
  score: number;
  descendants?: number;
  type: "story" | "job" | "comment" | "poll" | "pollopt";
}

export interface AINewsItem {
  id: number;
  title: string;
  url: string | null;
  author: string;
  score: number;
  commentsCount: number;
  postedAt: Date;
}
