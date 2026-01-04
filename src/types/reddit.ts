// Reddit API response types
export interface RedditListingResponse {
  kind: "Listing";
  data: {
    children: RedditPost[];
    after: string | null;
    before: string | null;
  };
}

export interface RedditPost {
  kind: "t3";
  data: RedditPostData;
}

export interface RedditPostData {
  id: string;
  title: string;
  url: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  is_self: boolean;
  permalink: string;
  over_18: boolean;
  stickied: boolean;
}

// Configuration for Reddit news fetching
export interface RedditFetchOptions {
  subreddits: string[];
  sort: "hot" | "top" | "new";
  timeframe?: "hour" | "day" | "week" | "month" | "year" | "all";
  minScore: number;
  limit: number;
}

export const DEFAULT_AI_SUBREDDITS = [
  "MachineLearning",
  "artificial",
  "deeplearning",
  "LocalLLaMA",
];
