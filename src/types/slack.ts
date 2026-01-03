export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string;
    url?: string;
  }>;
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

export interface SlackNotifyResult {
  success: boolean;
  error: string | null;
}
