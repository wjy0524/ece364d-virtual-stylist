import React, { useEffect, useState } from 'react';
import { Info, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { apiRequest } from '../lib/api';
import './recommendations.css';

const OCCASIONS = ['All occasions', 'Everyday', 'Work', 'Formal', 'Weekend', 'Going out'];

function OutfitCard({ outfit, saved, feedback, busy, onSave, onFeedback }) {
  return (
    <article className="outfit-card recommendation-card">
      <div className="recommendation-items">
        {outfit.items.map((item) => (
          <div className="recommendation-item" key={item.id}>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name || item.subcategory || item.category} />
            ) : (
              <div className="recommendation-no-image" aria-label="No photo available">
                Photo not added
              </div>
            )}
            <div className="recommendation-item-label">
              <strong>{item.name || item.subcategory || item.category}</strong>
              <span>
                {[item.color, item.pattern, item.category].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="outfit-body">
        <div className="outfit-top">
          <span>{outfit.occasion}</span>
          <span className="score">RANK {Number(outfit.ranking_score).toFixed(1)} / 100</span>
        </div>
        <p className="recommendation-explanation">{outfit.explanation}</p>
        {outfit.score_breakdown && (
          <div className="recommendation-score-details">
            Occasion {outfit.score_breakdown.occasion}% · Style {outfit.score_breakdown.style}% ·
            Color {outfit.score_breakdown.color}% · Variety {outfit.score_breakdown.diversity}%
          </div>
        )}
        <div className="recommendation-actions">
          <button
            className={saved ? 'recommendation-action saved' : 'recommendation-action'}
            onClick={() => onSave(outfit)}
            disabled={busy}
          >
            {saved ? 'Saved look' : 'Save look'}
          </button>
          <div className="recommendation-feedback" aria-label="Rate this recommendation">
            <button
              className={feedback === true ? 'selected' : ''}
              aria-label="Helpful recommendation"
              aria-pressed={feedback === true}
              onClick={() => onFeedback(outfit, true)}
              disabled={busy}
            >
              <ThumbsUp size={15} /> Helpful
            </button>
            <button
              className={feedback === false ? 'selected' : ''}
              aria-label="Not helpful recommendation"
              aria-pressed={feedback === false}
              onClick={() => onFeedback(outfit, false)}
              disabled={busy}
            >
              <ThumbsDown size={15} /> Not helpful
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Recommendations() {
  const [occasion, setOccasion] = useState('All occasions');
  const [data, setData] = useState(null);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    setActionError('');

    const query = occasion === 'All occasions' ? '' : `?occasion=${encodeURIComponent(occasion)}`;
    Promise.allSettled([
      apiRequest(`/api/recommendations${query}`),
      apiRequest('/api/recommendations/saved'),
    ])
      .then(([recommendationResult, savedResult]) => {
        if (cancelled) return;
        if (recommendationResult.status === 'rejected') {
          setError(recommendationResult.reason.message);
          return;
        }
        setData(recommendationResult.value);
        // Restore thumbs-up/down state saved on earlier visits.
        setFeedback((previous) => ({
          ...previous,
          ...Object.fromEntries(
            recommendationResult.value.recommendations
              .filter((outfit) => outfit.feedback != null)
              .map((outfit) => [outfit.id, outfit.feedback]),
          ),
        }));
        if (savedResult.status === 'fulfilled') {
          setSavedOutfits(savedResult.value);
        } else {
          setActionError(`Saved looks could not be loaded: ${savedResult.reason.message}`);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [occasion]);

  const isSaved = (outfit) =>
    savedOutfits.some((saved) => saved.id === outfit.id);

  async function saveOutfit(outfit) {
    setBusyId(outfit.id);
    setActionError('');
    try {
      if (isSaved(outfit)) {
        await apiRequest(`/api/recommendations/saved/${outfit.id}`, { method: 'DELETE' });
        setSavedOutfits((saved) => saved.filter((entry) => entry.id !== outfit.id));
      } else {
        await apiRequest('/api/recommendations/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_ids: outfit.items.map((item) => item.id),
            occasion: outfit.occasion,
            explanation: outfit.explanation,
            ranking_score: outfit.ranking_score,
          }),
        });
        setSavedOutfits((saved) => [outfit, ...saved]);
      }
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusyId('');
    }
  }

  async function rateOutfit(outfit, helpful) {
    setBusyId(outfit.id);
    setActionError('');
    try {
      await apiRequest('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_ids: outfit.items.map((item) => item.id),
          occasion: outfit.occasion,
          helpful,
        }),
      });
      setFeedback((previous) => ({ ...previous, [outfit.id]: helpful }));
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusyId('');
    }
  }

  const recommendations = data?.recommendations || [];

  return (
    <>
      <div className="eyebrow">03 / PERSONAL STYLING</div>
      <div className="heading-row">
        <div>
          <h1>Looks made <em>for you.</em></h1>
          <p className="lede">Outfit ideas built from pieces you actually own.</p>
        </div>
        <span className="soft-label"><Sparkles size={16} /> YOUR WARDROBE</span>
      </div>

      <div className="toolbar">
        <div className="filter-tabs" aria-label="Filter recommendations by occasion">
          {OCCASIONS.map((value) => (
            <button
              key={value}
              className={occasion === value ? 'current' : ''}
              aria-pressed={occasion === value}
              onClick={() => setOccasion(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="recommendation-status" role="status">Finding outfits from your closet…</p>}
      {error && <p className="classification-error" role="alert">{error}</p>}

      {!isLoading && !error && data?.metadata_missing?.length > 0 && (
        <div className="notice banner recommendation-notice">
          <Info size={19} />
          <div>
            <strong>Some wardrobe details are missing</strong>
            <ul>{data.metadata_missing.map((note) => <li key={note}>{note}</li>)}</ul>
          </div>
        </div>
      )}

      {actionError && <p className="classification-error" role="alert">{actionError}</p>}

      {!isLoading && !error && recommendations.length > 0 && (
        <>
          {data.message && <p className="recommendation-status">{data.message}</p>}
          <div className="outfit-grid recommendation-grid">
            {recommendations.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                saved={isSaved(outfit)}
                feedback={feedback[outfit.id]}
                busy={busyId === outfit.id}
                onSave={saveOutfit}
                onFeedback={rateOutfit}
              />
            ))}
          </div>
        </>
      )}

      {!isLoading && !error && recommendations.length === 0 && (
        <div className="empty recommendation-empty">
          <span>👕</span>
          <h2>No complete looks yet</h2>
          <p>{data?.message || 'Add clothing to your closet to get outfit recommendations.'}</p>
          {data?.missing_categories?.length > 0 && (
            <p>Still needed: {data.missing_categories.join(', ')}.</p>
          )}
        </div>
      )}

      {!isLoading && !error && savedOutfits.length > 0 && (
        <section className="saved-recommendations">
          <div className="eyebrow">YOUR COLLECTION</div>
          <h2>Saved looks</h2>
          <div className="outfit-grid recommendation-grid">
            {savedOutfits.map((outfit) => (
              <OutfitCard
                key={`saved-${outfit.id}`}
                outfit={outfit}
                saved
                feedback={feedback[outfit.id]}
                busy={busyId === outfit.id}
                onSave={saveOutfit}
                onFeedback={rateOutfit}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
