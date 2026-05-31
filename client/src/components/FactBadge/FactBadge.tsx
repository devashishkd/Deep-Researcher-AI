import { FactCheckResult } from '../../types/index.js';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import './FactBadge.css';

interface FactBadgeProps {
  factCheck: FactCheckResult;
  index: number;
}

export const FactBadge = ({ factCheck, index }: FactBadgeProps) => {
  const icon =
    factCheck.confidence === 'high' ? (
      <CheckCircle2 size={14} />
    ) : factCheck.confidence === 'medium' ? (
      <AlertTriangle size={14} />
    ) : (
      <XCircle size={14} />
    );

  return (
    <div className={`fact-badge fact-badge--${factCheck.confidence} ${!factCheck.verified ? 'fact-badge--unverified' : ''}`}>
      <div className="fact-badge__header">
        <span className={`fact-badge__conf badge badge-${
          factCheck.confidence === 'high' ? 'success' :
          factCheck.confidence === 'medium' ? 'warning' : 'danger'
        }`}>
          {icon}
          {factCheck.confidence}
        </span>
        {!factCheck.verified && (
          <span className="badge badge-danger">Unverified</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          #{index + 1}
        </span>
      </div>
      <p className="fact-badge__claim">{factCheck.claim}</p>
      <p className="fact-badge__explanation">{factCheck.explanation}</p>
      {factCheck.supportingSources.length > 0 && (
        <div className="fact-badge__sources">
          <span className="fact-badge__sources-label">Supported by:</span>
          {factCheck.supportingSources.slice(0, 3).map((s) => (
            <span key={s} className="fact-badge__source-domain">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
};
