import { ResearchSource } from '../../types/index.js';
import { ExternalLink } from 'lucide-react';
import './SourceCard.css';

interface SourceCardProps {
  source: ResearchSource;
  index: number;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  tavily: 'Web',
  duckduckgo: 'DDG',
  wikipedia: 'Wiki',
  news: 'News',
  scraped: 'Scraped',
};

const SOURCE_TYPE_CLASS: Record<string, string> = {
  wikipedia: 'badge-success',
  news: 'badge-warning',
  tavily: 'badge-accent',
  duckduckgo: 'badge-accent',
  scraped: 'badge-neutral',
};

export const SourceCard = ({ source, index }: SourceCardProps) => {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="source-card"
      aria-label={`Source ${index + 1}: ${source.title}`}
    >
      <div className="source-card__num">[{index + 1}]</div>
      <div className="source-card__content">
        <div className="source-card__header">
          <span className="source-card__title">{source.title || source.domain}</span>
          <ExternalLink size={12} className="source-card__link-icon" />
        </div>
        <div className="source-card__meta">
          <span className="source-card__domain">{source.domain}</span>
          <span className={`badge ${SOURCE_TYPE_CLASS[source.sourceType] || 'badge-neutral'}`}>
            {SOURCE_TYPE_LABELS[source.sourceType] || source.sourceType}
          </span>
          {source.publishedAt && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(source.publishedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {source.snippet && (
          <p className="source-card__snippet">
            {source.snippet.slice(0, 150)}...
          </p>
        )}
      </div>
    </a>
  );
};
