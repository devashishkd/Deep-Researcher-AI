import { useState, useRef, useEffect } from 'react';
import { Search, Zap, BookOpen, Microscope, Globe } from 'lucide-react';
import { ResearchDepth } from '../../types/index.js';
import './SearchPanel.css';

interface SearchPanelProps {
  onSubmit: (query: string, depth: ResearchDepth) => void;
  isLoading?: boolean;
}

const EXAMPLE_QUERIES = [
  { emoji: '🧬', text: 'What are the latest breakthroughs in CRISPR gene therapy in 2024–2025?' },
  { emoji: '🤖', text: 'How does Claude differ from GPT-4 and Gemini in reasoning capabilities?' },
  { emoji: '⚡', text: 'What is the current state of solid-state battery technology?' },
  { emoji: '🌍', text: 'What are the economic impacts of AI on global job markets?' },
  { emoji: '🚀', text: 'Compare SpaceX Starship vs NASA SLS for deep space missions' },
  { emoji: '💊', text: 'What does research say about GLP-1 drugs beyond weight loss?' },
];

const DEPTH_OPTIONS: { value: ResearchDepth; label: string; desc: string }[] = [
  { value: 'quick', label: 'Quick', desc: '~30s' },
  { value: 'standard', label: 'Standard', desc: '~90s' },
  { value: 'deep', label: 'Deep', desc: '~3min' },
];

const TOOLS = ['Tavily', 'DuckDuckGo', 'Wikipedia', 'NewsAPI', 'Readability'];

export const SearchPanel = ({ onSubmit, isLoading }: SearchPanelProps) => {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<ResearchDepth>('standard');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim(), depth);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="search-panel">
      <div className="search-panel__header">
        <div className="search-panel__logo">
          <div className="search-panel__logo-icon">
            <Microscope size={26} color="white" />
          </div>
          <span className="search-panel__logo-text">DeepResearcher</span>
        </div>
        <h1 className="search-panel__title">
          Research anything,<br />know everything.
        </h1>
        <p className="search-panel__subtitle">
          Multi-source AI research with real-time fact-checking. 
          Powered by LangGraph, Tavily, Gemini Flash, and 4 more tools.
        </p>
      </div>

      <form className="search-panel__form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          id="research-query"
          className="search-panel__textarea"
          placeholder="What do you want to research? e.g. 'Explain the current state of quantum computing and its near-term commercial applications'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          maxLength={500}
          aria-label="Research query"
        />

        <div className="search-panel__options">
          <span className="search-panel__depth-label">Depth:</span>
          <div className="search-panel__depth-tabs" role="tablist" aria-label="Research depth">
            {DEPTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={depth === opt.value}
                className={`search-panel__depth-tab ${depth === opt.value ? 'search-panel__depth-tab--active' : ''}`}
                onClick={() => setDepth(opt.value)}
                title={opt.desc}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            id="start-research-btn"
            type="submit"
            className="btn btn-primary search-panel__submit"
            disabled={!query.trim() || isLoading}
            aria-label="Start research"
          >
            {isLoading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                Starting...
              </>
            ) : (
              <>
                <Search size={16} />
                Research  <kbd style={{ opacity: 0.6, fontSize: 11, marginLeft: 4 }}>⌘↵</kbd>
              </>
            )}
          </button>
        </div>

        <div className="search-panel__footer">
          {TOOLS.map((tool) => (
            <div key={tool} className="search-panel__tool-pill">
              <span />
              {tool}
            </div>
          ))}
        </div>
      </form>

      <div className="search-panel__examples animate-fade-in delay-300">
        <div className="search-panel__examples-title">Try these examples</div>
        <div className="search-panel__examples-grid">
          {EXAMPLE_QUERIES.map((ex) => (
            <button
              key={ex.text}
              type="button"
              className="search-panel__example-card"
              onClick={() => setQuery(ex.text)}
              aria-label={`Use example: ${ex.text}`}
            >
              <span className="search-panel__example-emoji">{ex.emoji}</span>
              <span className="search-panel__example-text">{ex.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
