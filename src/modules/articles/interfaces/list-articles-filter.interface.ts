export interface ListArticlesFilter {
  tag?: string;
  author?: string;
  favorited?: string;
  limit: number;
  offset: number;
}

export interface FeedArticlesFilter {
  limit: number;
  offset: number;
}
