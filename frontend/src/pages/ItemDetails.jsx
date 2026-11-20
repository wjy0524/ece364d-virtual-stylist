import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Info, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useCloset } from './Closet';
import { apiRequest } from '../lib/api';
import FitFeedbackFields, { createEmptyFitFeedback } from '../components/FitFeedbackFields';
import './clothing-classification.css';

const FIT_LABELS = {
  too_small: 'Too small',
  slightly_tight: 'Slightly tight',
  fits_as_desired: 'Fits as desired',
  fits_well: 'Fits well',
  slightly_loose: 'Slightly loose',
  too_large: 'Too large',
};

const CUT_LABELS = {
  fitted: 'Fitted',
  slim: 'Slim',
  regular: 'Regular',
  relaxed: 'Relaxed',
  oversized: 'Oversized',
};

function localItems() {
  try {
    return JSON.parse(localStorage.getItem('vs-items') || '[]');
  } catch (error) {
    console.error('Could not read locally saved closet items.', error);
    return [];
  }
}

function saveLocalFeedback(item, feedback) {
  const items = localItems();
  const itemIndex = items.findIndex((entry) => entry.id === item.id);
  if (itemIndex < 0) {
    items.push({ ...item, fit_feedback: feedback });
  } else {
    items[itemIndex] = { ...items[itemIndex], fit_feedback: feedback };
  }
  localStorage.setItem('vs-items', JSON.stringify(items));
}

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, loadError } = useCloset();
  const item = items.find((closetItem) => closetItem.id === id);
  const [fitHistory, setFitHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [fitFormOpen, setFitFormOpen] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [fitForm, setFitForm] = useState(createEmptyFitFeedback);
  const [savingFeedback, setSavingFeedback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadFitHistory() {
      if (!item) return;
      if (!item.isRemote) {
        setFitHistory(item.fit_feedback || []);
        return;
      }
      try {
        const history = await apiRequest(`/api/items/${item.id}/fit-feedback`);
        if (!cancelled) {
          setFitHistory(history);
          setHistoryError('');
        }
      } catch (error) {
        if (!cancelled) setHistoryError(`Could not load fit history: ${error.message}`);
      }
    }

    loadFitHistory();
    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.isRemote, item?.fit_feedback]);

  if (!item) {
    return (
      <>
        {loadError && <p className="classification-error" role="alert">{loadError}</p>}
        <h1>Item not found</h1>
        <Link to="/closet">Return to closet</Link>
      </>
    );
  }

  function startAddingFeedback() {
    setEditingFeedbackId(null);
    setFitForm(createEmptyFitFeedback());
    setFitFormOpen(true);
  }

  function startEditingFeedback(feedback) {
    setEditingFeedbackId(feedback.id);
    setFitForm({
      overall_fit: feedback.overall_fit,
      issues: feedback.issues || [],
      notes: feedback.notes || '',
    });
    setFitFormOpen(true);
  }

  async function saveFeedback(event) {
    event.preventDefault();
    if (!fitForm.overall_fit) return;
    setSavingFeedback(true);
    setHistoryError('');
    const body = {
      overall_fit: fitForm.overall_fit,
      issues: fitForm.issues,
      notes: fitForm.notes.trim() || null,
    };

    try {
      let updatedHistory;
      if (item.isRemote) {
        const saved = editingFeedbackId
          ? await apiRequest(`/api/items/${item.id}/fit-feedback/${editingFeedbackId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          : await apiRequest(`/api/items/${item.id}/fit-feedback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
        updatedHistory = editingFeedbackId
          ? fitHistory.map((entry) => (entry.id === saved.id ? saved : entry))
          : [saved, ...fitHistory];
      } else {
        const saved = {
          ...body,
          id: editingFeedbackId || `local-feedback-${Date.now()}`,
          item_id: item.id,
          created_at: editingFeedbackId
            ? fitHistory.find((entry) => entry.id === editingFeedbackId)?.created_at
            : new Date().toISOString(),
        };
        updatedHistory = editingFeedbackId
          ? fitHistory.map((entry) => (entry.id === saved.id ? saved : entry))
          : [saved, ...fitHistory];
        saveLocalFeedback(item, updatedHistory);
      }
      setFitHistory(updatedHistory);
      setFitFormOpen(false);
      setEditingFeedbackId(null);
    } catch (error) {
      setHistoryError(`Could not save fit feedback: ${error.message}`);
    } finally {
      setSavingFeedback(false);
    }
  }

  function removeTestItem() {
    const remaining = localItems().filter((entry) => entry.id !== item.id);
    localStorage.setItem('vs-items', JSON.stringify(remaining));
    navigate('/closet', { replace: true });
  }

  return (
    <>
      <Link className="back" to="/closet"><ArrowLeft size={16} /> Back to closet</Link>
      <div className="details">
        <div className="details-art" style={{ background: item.tone }}>
          {item.image ? <img src={item.image} alt={item.name} /> : <span>{item.emoji}</span>}
        </div>
        <div className="details-info">
          <div className="eyebrow">YOUR CLOSET / {item.category.toUpperCase()}</div>
          <h1>{item.name}</h1>
          <p className="lede">A versatile piece from your personal wardrobe.</p>
          <div className="detail-table">
            {[
              ['Category', item.category],
              ['Clothing type', item.subcategory || 'Not specified'],
              ['Brand', item.brand || 'Not specified'],
              ['Labeled size', item.size_label || 'Not specified'],
              ['Garment cut', CUT_LABELS[item.garment_cut] || 'Not specified'],
              ['Color', item.color],
              ['Season', item.season],
            ].map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
          {item.is_test_item && (
            <div className="test-item-notice">
              <strong>Temporary test garment</strong>
              <p>This browser-only item can be removed after testing.</p>
              <button type="button" className="secondary-button" onClick={removeTestItem}>
                <Trash2 size={15} /> Remove test garment
              </button>
            </div>
          )}
          <section className="fit-history">
            <div className="fit-history-heading">
              <div>
                <h2>Fit feedback</h2>
                <p>Keep notes to help with future size recommendations.</p>
              </div>
              <button type="button" className="secondary-button" onClick={startAddingFeedback}>
                <Plus size={15} /> Add feedback
              </button>
            </div>
            {historyError && <p className="classification-error" role="alert">{historyError}</p>}
            {fitHistory.length === 0 && <p className="fit-history-empty">No fit feedback yet. You can add it whenever you’re ready.</p>}
            {fitHistory.map((feedback, index) => (
              <article className="fit-history-entry" key={feedback.id}>
                <div className="fit-history-entry-heading">
                  <strong>{FIT_LABELS[feedback.overall_fit] || feedback.overall_fit}</strong>
                  {index === 0 && (
                    <button type="button" className="text-button" onClick={() => startEditingFeedback(feedback)}>
                      Edit
                    </button>
                  )}
                </div>
                {feedback.issues?.length > 0 && (
                  <p>{feedback.issues.map(({ area, issue }) => `${area.replaceAll('_', ' ')}: ${issue}`).join(' · ')}</p>
                )}
                {feedback.notes && <p>{feedback.notes}</p>}
                {feedback.created_at && <time dateTime={feedback.created_at}>{new Date(feedback.created_at).toLocaleDateString()}</time>}
              </article>
            ))}
            {fitFormOpen && (
              <form className="fit-feedback-edit-form" onSubmit={saveFeedback}>
                <h3>{editingFeedbackId ? 'Edit latest feedback' : 'Add fit feedback'}</h3>
                <FitFeedbackFields
                  category={item.category}
                  value={fitForm}
                  onChange={(changes) => setFitForm((current) => ({ ...current, ...changes }))}
                  idPrefix="details-fit"
                />
                {historyError && <p className="classification-error" role="alert">{historyError}</p>}
                <div className="fit-form-actions">
                  <button type="button" className="secondary-button" onClick={() => setFitFormOpen(false)}>Cancel</button>
                  <button type="submit" className="primary" disabled={!fitForm.overall_fit || savingFeedback}>
                    {savingFeedback ? 'Saving…' : 'Save feedback'}
                  </button>
                </div>
              </form>
            )}
          </section>
          <div className="notice">
            <Info size={20} />
            <div>
              <strong>Virtual try-on coming soon</strong>
              <p>Your team can connect a pretrained try-on model here. No generated try-on image is available in this demo.</p>
            </div>
          </div>
          <Link to="/recommendations" className="primary inline">Style this item <Sparkles size={17} /></Link>
          <Link to="/shopping" className="secondary-link">Discover similar pieces <ArrowRight size={16} /></Link>
        </div>
      </div>
    </>
  );
}
