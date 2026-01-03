"use client";

import type { NewsSummary } from "@/types/news";

interface NewsCardProps {
  article: NewsSummary;
}

export function NewsCard({ article }: NewsCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <article className="news-card" data-testid="news-item">
      <div className="news-card-header">
        <span className="news-category">{article.category}</span>
        <span className={`news-sentiment ${article.sentiment}`}>
          {article.sentiment}
        </span>
      </div>

      <h2 className="news-title" data-testid="news-title">
        {article.url ? (
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            {article.title}
          </a>
        ) : (
          article.title
        )}
      </h2>

      <p className="news-summary">{article.summary}</p>

      {article.keyPoints.length > 0 && (
        <ul className="news-keypoints">
          {article.keyPoints.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      )}

      <div className="news-meta">
        <span data-testid="news-date">{formatDate(article.createdAt)}</span>
        <span data-testid="news-score">ID: {article.id}</span>
      </div>
    </article>
  );
}
