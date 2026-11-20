import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { supabase } from '../lib/supabase';

const STYLES = ['Minimalist', 'Streetwear', 'Classic', 'Sporty', 'Contemporary', 'Vintage'];
const OCCASIONS = ['Everyday', 'Work', 'Formal', 'Weekend', 'Going out'];
const COLORS = ['Neutrals', 'Earth tones', 'Pastels', 'Bold colors'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [style, setStyle] = useState(localStorage.getItem('vs-style') || 'Minimalist');
  const [occasion, setOccasion] = useState(localStorage.getItem('vs-occasion') || 'Everyday');
  const [size, setSize] = useState(localStorage.getItem('vs-size') || 'M');
  const [colors, setColors] = useState(['Neutrals']);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function save() {
    setSaving(true);
    setSaveError('');
    try {
      localStorage.setItem('vs-style', style);
      localStorage.setItem('vs-occasion', occasion);
      localStorage.setItem('vs-size', size);
      localStorage.setItem('vs-colors', JSON.stringify(colors));

      if (supabase) {
        const profile = await apiRequest('/api/me');
        const preferences = profile.style_preferences || {};
        await apiRequest('/api/me/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aesthetics: [style.toLowerCase()],
            preferred_fits: preferences.preferred_fits || [],
            occasions: [occasion.toLowerCase()],
            disliked_items: preferences.disliked_items || [],
          }),
        });
      }

      navigate('/closet');
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="eyebrow">01 / GETTING STARTED</div>
      <h1>Let&apos;s find your <em>style.</em></h1>
      <p className="lede">
        Tell us a little about what you love. Your preferences will help personalize future recommendations.
      </p>
      <div className="form-panel">
        <div className="step-title">
          <span className="step-dot">01</span>
          <div><h2>Your aesthetic</h2><p>Choose the style that feels most like you.</p></div>
        </div>
        <div className="choice-grid">
          {STYLES.map((value) => (
            <button
              type="button"
              key={value}
              className={`choice ${style === value ? 'selected' : ''}`}
              onClick={() => setStyle(value)}
            >
              {value}{style === value && <Check size={16} />}
            </button>
          ))}
        </div>
        <hr />
        <div className="step-title">
          <span className="step-dot">02</span>
          <div><h2>What are you dressing for?</h2><p>Pick your most common occasion.</p></div>
        </div>
        <div className="pills">
          {OCCASIONS.map((value) => (
            <button
              type="button"
              className={`pill ${occasion === value ? 'selected' : ''}`}
              onClick={() => setOccasion(value)}
              key={value}
            >
              {value}
            </button>
          ))}
        </div>
        <hr />
        <div className="step-title">
          <span className="step-dot">03</span>
          <div><h2>Your preferences</h2><p>Optional details to make styling feel more personal.</p></div>
        </div>
        <label className="field-label" htmlFor="size">Typical top size</label>
        <select id="size" value={size} onChange={(event) => setSize(event.target.value)}>
          {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((value) => <option key={value}>{value}</option>)}
        </select>
        <label className="field-label">Favorite color palette</label>
        <div className="pills">
          {COLORS.map((value) => (
            <button
              type="button"
              key={value}
              className={`pill ${colors.includes(value) ? 'selected' : ''}`}
              onClick={() => setColors((current) =>
                current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]
              )}
            >
              {value}
            </button>
          ))}
        </div>
        {saveError && <p className="classification-error" role="alert">{saveError}</p>}
        <div className="form-footer">
          <span>You can update these preferences anytime.</span>
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save & explore closet'} <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </>
  );
}
