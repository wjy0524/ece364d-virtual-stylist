import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { items as seed } from '../data/demo';
import { apiRequest } from '../lib/api';
import { supabase } from '../lib/supabase';
import FitFeedbackFields, { createEmptyFitFeedback } from '../components/FitFeedbackFields';
import './clothing-classification.css';

const CATEGORY_LABELS = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  shoes: 'Shoes',
  layer: 'Outerwear',
  accessory: 'Accessories',
};

const SUBCATEGORIES = {
  top: [
    ['t-shirt', 'T-shirt'],
    ['tank top', 'Tank top'],
    ['blouse', 'Blouse'],
    ['sweater', 'Sweater'],
  ],
  bottom: [
    ['jeans', 'Jeans'],
    ['pants', 'Pants'],
    ['shorts', 'Shorts'],
    ['skirt', 'Skirt'],
  ],
  dress: [['dress', 'Dress']],
  shoes: [
    ['sneakers', 'Sneakers'],
    ['boots', 'Boots'],
    ['heels', 'Heels'],
  ],
};

function localItems() {
  try {
    return JSON.parse(localStorage.getItem('vs-items') || '[]');
  } catch (error) {
    console.error('Could not read locally saved closet items.', error);
    return [];
  }
}

function initialClosetItems() {
  const savedItems = localItems();
  const savedById = new Map(savedItems.map((item) => [item.id, item]));
  const seedIds = new Set(seed.map((item) => item.id));
  return [
    ...seed.map((item) => ({ ...item, ...savedById.get(item.id) })),
    ...savedItems.filter((item) => !seedIds.has(item.id)),
  ];
}

function fromApiItem(item) {
  return {
    ...item,
    isRemote: true,
    name: item.name || item.subcategory || 'Clothing item',
    category: CATEGORY_LABELS[item.category] || item.category,
    color: item.color || 'Not specified',
    season: item.season || 'All season',
    tone: '#eee5db',
    emoji: '👕',
    image: item.image_url || '',
  };
}

export function useCloset() {
  const [items, setItems] = useState(initialClosetItems);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteItems() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) return;
        const remoteItems = await apiRequest('/api/items');
        if (!cancelled) {
          setItems([...initialClosetItems(), ...remoteItems.map(fromApiItem)]);
        }
      } catch (error) {
        if (!cancelled) setLoadError(`Could not load your saved items: ${error.message}`);
      }
    }

    loadRemoteItems();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loadError };
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

export default function Closet() {
  const navigate = useNavigate();
  const { items, loadError } = useCloset();
  const [filter, setFilter] = useState('All items');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [temporaryTestItem, setTemporaryTestItem] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [garmentCut, setGarmentCut] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [fitFeedback, setFitFeedback] = useState(createEmptyFitFeedback);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [classification, setClassification] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingItemId, setPendingItemId] = useState(null);
  const [pendingFeedbackId, setPendingFeedbackId] = useState(null);
  const classificationRequest = useRef(0);
  const categoryEdited = useRef(false);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const categories = ['All items', ...Object.values(CATEGORY_LABELS)];
  const visible = items.filter(
    (item) =>
      (filter === 'All items' || item.category === filter) &&
      item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openAddForm(isTemporaryTestItem) {
    setTemporaryTestItem(isTemporaryTestItem);
    setAdding(true);
  }

  async function classifyFile(selectedFile) {
    const requestId = ++classificationRequest.current;
    setFile(selectedFile);
    setClassification(null);
    setClassificationError('');
    categoryEdited.current = false;
    setCategory('');
    setSubcategory('');
    if (!selectedFile) {
      setImagePreview('');
      return;
    }

    setImagePreview(URL.createObjectURL(selectedFile));
    setClassifying(true);
    try {
      const body = new FormData();
      body.append('file', selectedFile);
      const result = await apiRequest(
        '/api/items/classify',
        { method: 'POST', body },
        { allowAnonymous: true },
      );
      if (requestId !== classificationRequest.current) return;
      setClassification(result);
      if (!categoryEdited.current) {
        setCategory(result.top_prediction.category);
        setSubcategory(result.top_prediction.subcategory);
      }
    } catch (error) {
      if (requestId === classificationRequest.current) {
        setClassificationError(`${error.message} You can still enter the category manually.`);
      }
    } finally {
      if (requestId === classificationRequest.current) setClassifying(false);
    }
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!name.trim() || !category) return;
    setSaving(true);
    setSaveError('');

    try {
      const { data, error } = supabase ? await supabase.auth.getSession() : { data: { session: null }, error: null };
      if (error) throw error;

      if (!data.session || temporaryTestItem) {
        let image = '';
        if (file) {
          if (file.size > 1_200_000) {
            throw new Error('Sign in to save images larger than 1.2 MB. You can also choose a smaller image.');
          }
          image = await readAsDataUrl(file);
        }
        const localItem = {
          id: `custom-${Date.now()}`,
          is_test_item: temporaryTestItem,
          name: name.trim(),
          category: CATEGORY_LABELS[category],
          subcategory,
          brand: brand.trim(),
          size_label: sizeLabel.trim(),
          garment_cut: garmentCut,
          color: 'Not specified',
          season: 'All season',
          emoji: '👕',
          tone: '#eee5db',
          image,
          fit_feedback: fitFeedback.overall_fit
            ? [{
                id: `local-feedback-${Date.now()}`,
                ...fitFeedback,
                created_at: new Date().toISOString(),
              }]
            : [],
          ai_tags: classification
            ? {
                model: classification.model,
                top_prediction: classification.top_prediction,
                second_prediction: classification.second_prediction,
              }
            : {},
        };
        localStorage.setItem('vs-items', JSON.stringify([...localItems(), localItem]));
      } else {
        const itemData = {
          name: name.trim(),
          category,
          brand: brand.trim() || null,
          size_label: sizeLabel.trim() || null,
          garment_cut: garmentCut || null,
          subcategory: subcategory || null,
          tags_confirmed: true,
          ai_tags: classification
            ? {
                model: classification.model,
                top_prediction: classification.top_prediction,
                second_prediction: classification.second_prediction,
              }
            : {},
        };
        let itemId = pendingItemId;
        if (itemId) {
          await apiRequest(`/api/items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData),
          });
        } else {
          const created = await apiRequest('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData),
          });
          itemId = created.id;
          setPendingItemId(itemId);
        }
        if (file) {
          const body = new FormData();
          body.append('file', file);
          await apiRequest(`/api/items/${itemId}/image`, { method: 'POST', body });
        }
        if (fitFeedback.overall_fit) {
          const feedbackBody = {
            overall_fit: fitFeedback.overall_fit,
            issues: fitFeedback.issues,
            notes: fitFeedback.notes.trim() || null,
          };
          if (pendingFeedbackId) {
            await apiRequest(`/api/items/${itemId}/fit-feedback/${pendingFeedbackId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(feedbackBody),
            });
          } else {
            const savedFeedback = await apiRequest(`/api/items/${itemId}/fit-feedback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(feedbackBody),
            });
            setPendingFeedbackId(savedFeedback.id);
          }
        }
      }

      window.location.reload();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function closeForm() {
    classificationRequest.current += 1;
    categoryEdited.current = false;
    setAdding(false);
    setTemporaryTestItem(false);
    setName('');
    setBrand('');
    setSizeLabel('');
    setGarmentCut('');
    setCategory('');
    setSubcategory('');
    setFitFeedback(createEmptyFitFeedback());
    setFile(null);
    setImagePreview('');
    setClassification(null);
    setClassifying(false);
    setClassificationError('');
    setSaveError('');
    setPendingItemId(null);
    setPendingFeedbackId(null);
  }

  return (
    <>
      <div className="eyebrow">02 / YOUR WARDROBE</div>
      <div className="heading-row">
        <div>
          <h1>Your closet, <em>reimagined.</em></h1>
          <p className="lede">Every great outfit starts with what you already own.</p>
        </div>
        <div className="closet-add-actions">
          <button className="secondary-button" onClick={() => openAddForm(true)}>
            <Plus size={16} /> Add test garment
          </button>
          <button className="primary" onClick={() => openAddForm(false)}>
            <Plus size={17} /> Add an item
          </button>
        </div>
      </div>
      {loadError && <p className="classification-error" role="alert">{loadError}</p>}
      <div className="stat-row">
        <div><strong>{items.length}</strong><span>PIECES IN YOUR CLOSET</span></div>
        <div><strong>{new Set(items.map((item) => item.category)).size}</strong><span>CATEGORIES</span></div>
        <div className="stat-cta" onClick={() => navigate('/recommendations')}>
          <span>NEED INSPIRATION?</span>
          <strong>Get outfit ideas <ArrowUpRight size={19} /></strong>
        </div>
      </div>
      <div className="toolbar">
        <div className="filter-tabs">
          {categories.map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={filter === value ? 'current' : ''}>
              {value}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input
            placeholder="Search your closet"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="item-grid">
        {visible.map((item) => (
          <Link to={`/closet/${item.id}`} className="item-card" key={item.id}>
            <div className="item-art" style={{ background: item.tone }}>
              {item.image ? <img src={item.image} alt={item.name} /> : <span>{item.emoji}</span>}
              <span className="card-arrow"><ArrowUpRight size={17} /></span>
            </div>
            <div className="item-meta">
              <span>{item.category.toUpperCase()}</span>
              <h3>{item.name}</h3>
              <p>{item.subcategory || item.color}</p>
            </div>
          </Link>
        ))}
      </div>
      {visible.length === 0 && <div className="empty">No pieces match your search.</div>}
      {adding && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form className="modal classification-modal" onClick={(event) => event.stopPropagation()} onSubmit={saveItem}>
            <button type="button" className="modal-close" onClick={closeForm}>×</button>
            <h2>{temporaryTestItem ? 'Add a temporary test garment' : 'Add a closet item'}</h2>
            {temporaryTestItem && (
              <p className="test-item-notice">
                Test-only: this stays in this browser and is not uploaded to your account. Remove it from its details page when finished.
              </p>
            )}
            <p>Upload a clothing photo for a FashionCLIP suggestion, or enter its type manually.</p>
            <label className="field-label" htmlFor="item-name">Item name</label>
            <input
              id="item-name"
              required
              placeholder="e.g. Blue linen shirt"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <label className="field-label" htmlFor="item-image">Clothing photo (optional)</label>
            <input
              id="item-image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              disabled={classifying}
              onChange={(event) => classifyFile(event.target.files?.[0] || null)}
            />
            {imagePreview && <img className="classification-preview" src={imagePreview} alt="Selected clothing" />}
            {classifying && <p className="classification-status" role="status">Analyzing your photo…</p>}
            {classificationError && <p className="classification-error" role="alert">{classificationError}</p>}
            {classification && (
              <div className="prediction-list" aria-live="polite">
                <p>FashionCLIP suggestions (scores)</p>
                {[classification.top_prediction, classification.second_prediction].map((prediction, index) => (
                  <div className="prediction-row" key={prediction.clothing_type}>
                    <span>{index === 0 ? 'Top match' : 'Second match'} · {prediction.clothing_type}</span>
                    <strong>{(prediction.score * 100).toFixed(1)}%</strong>
                  </div>
                ))}
              </div>
            )}
            <label className="field-label" htmlFor="item-category">Category</label>
            <select
              id="item-category"
              required
              value={category}
              onChange={(event) => {
                categoryEdited.current = true;
                setCategory(event.target.value);
                setSubcategory('');
              }}
            >
              <option value="">Choose a category</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <label className="field-label" htmlFor="item-subcategory">Clothing type</label>
            <select
              id="item-subcategory"
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
              disabled={!category}
            >
              <option value="">Choose a type (optional)</option>
              {(SUBCATEGORIES[category] || []).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <label className="field-label" htmlFor="item-brand">Brand (optional)</label>
            <input
              id="item-brand"
              placeholder="e.g. H&M"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            />
            <label className="field-label" htmlFor="item-size">Labeled size (optional)</label>
            <input
              id="item-size"
              placeholder="e.g. M, 8, 32x30"
              value={sizeLabel}
              onChange={(event) => setSizeLabel(event.target.value)}
            />
            <label className="field-label" htmlFor="item-cut">Garment cut (optional)</label>
            <select id="item-cut" value={garmentCut} onChange={(event) => setGarmentCut(event.target.value)}>
              <option value="">Not sure / not labeled</option>
              <option value="fitted">Fitted</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="relaxed">Relaxed</option>
              <option value="oversized">Oversized</option>
            </select>
            <div className="fit-feedback-section">
              <h3>How does it fit?</h3>
              <p>Optional now—you can add or update fit feedback later.</p>
              <FitFeedbackFields
                category={category}
                value={fitFeedback}
                onChange={(changes) => setFitFeedback((current) => ({ ...current, ...changes }))}
                idPrefix="new-item"
              />
            </div>
            {saveError && <p className="classification-error" role="alert">{saveError}</p>}
            <button className="primary full" type="submit" disabled={saving}>
              {saving ? 'Saving…' : pendingItemId ? 'Retry photo upload' : 'Save item'} <Plus size={16} />
            </button>
              <p className="classification-hint">
                For demo classification without signing in, set ALLOW_DEMO_CLASSIFICATION=true in backend/.env and restart the API.
                Items are still saved locally in demo mode.
              </p>
          </form>
        </div>
      )}
    </>
  );
}
