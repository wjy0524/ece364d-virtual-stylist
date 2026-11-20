import React from 'react';

const FIT_OPTIONS = [
  ['too_small', 'Too small'],
  ['slightly_tight', 'Slightly tight'],
  ['fits_as_desired', 'Fits as desired'],
  ['slightly_loose', 'Slightly loose'],
  ['too_large', 'Too large'],
];

const FIT_AREAS = {
  top: [
    ['shoulders', 'Shoulders'],
    ['chest', 'Chest'],
    ['waist', 'Waist'],
    ['sleeves', 'Sleeves'],
    ['length', 'Length'],
  ],
  bottom: [
    ['waist', 'Waist'],
    ['hips', 'Hips'],
    ['thighs', 'Thighs'],
    ['rise', 'Rise'],
    ['inseam', 'Inseam'],
    ['length', 'Length'],
  ],
  dress: [
    ['shoulders', 'Shoulders'],
    ['chest', 'Chest'],
    ['waist', 'Waist'],
    ['hips', 'Hips'],
    ['sleeves', 'Sleeves'],
    ['length', 'Length'],
  ],
  shoes: [
    ['foot_width', 'Foot width'],
    ['toe_box', 'Toe box'],
    ['heel', 'Heel'],
    ['length', 'Length'],
  ],
  layer: [
    ['shoulders', 'Shoulders'],
    ['chest', 'Chest'],
    ['waist', 'Waist'],
    ['sleeves', 'Sleeves'],
    ['length', 'Length'],
  ],
  accessory: [
    ['strap', 'Strap'],
    ['width', 'Width'],
    ['length', 'Length'],
  ],
};

const ISSUE_OPTIONS = [
  ['tight', 'Tight'],
  ['loose', 'Loose'],
  ['short', 'Short'],
  ['long', 'Long'],
];

function categoryKey(category) {
  return {
    Tops: 'top',
    Bottoms: 'bottom',
    Dresses: 'dress',
    Shoes: 'shoes',
    Outerwear: 'layer',
    Accessories: 'accessory',
  }[category] || category;
}

export default function FitFeedbackFields({ category, value, onChange, idPrefix }) {
  const areas = FIT_AREAS[categoryKey(category)] || FIT_AREAS.top;
  const fitOptions = value.overall_fit === 'fits_well'
    ? [...FIT_OPTIONS, ['fits_well', 'Fits well (legacy)']]
    : FIT_OPTIONS;

  function setArea(area, selected) {
    const existing = value.issues.find((issue) => issue.area === area);
    const issues = selected
      ? [...value.issues, { area, issue: 'tight' }]
      : value.issues.filter((issue) => issue.area !== area);
    if (selected && existing) return;
    onChange({ issues });
  }

  function setAreaIssue(area, issue) {
    onChange({
      issues: value.issues.map((entry) => (entry.area === area ? { ...entry, issue } : entry)),
    });
  }

  return (
    <div className="fit-feedback-fields">
      <label className="field-label" htmlFor={`${idPrefix}-overall-fit`}>How does it fit?</label>
      <select
        id={`${idPrefix}-overall-fit`}
        value={value.overall_fit}
        onChange={(event) => onChange({ overall_fit: event.target.value })}
      >
        <option value="">Skip fit feedback for now</option>
        {fitOptions.map(([fit, label]) => <option key={fit} value={fit}>{label}</option>)}
      </select>

      {value.overall_fit && (
        <>
          <fieldset className="fit-area-list">
            <legend>Any areas that need attention? (optional)</legend>
            {areas.map(([area, label]) => {
              const issue = value.issues.find((entry) => entry.area === area);
              const checkboxId = `${idPrefix}-area-${area}`;
              return (
                <div className="fit-area-row" key={area}>
                  <label htmlFor={checkboxId}>
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={Boolean(issue)}
                      onChange={(event) => setArea(area, event.target.checked)}
                    />
                    {label}
                  </label>
                  {issue && (
                    <select
                      aria-label={`${label} fit`}
                      value={issue.issue}
                      onChange={(event) => setAreaIssue(area, event.target.value)}
                    >
                      {ISSUE_OPTIONS.map(([kind, text]) => <option key={kind} value={kind}>{text}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </fieldset>
          <label className="field-label" htmlFor={`${idPrefix}-fit-notes`}>Optional note</label>
          <textarea
            id={`${idPrefix}-fit-notes`}
            rows={2}
            placeholder="Anything else about the fit?"
            value={value.notes || ''}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </>
      )}
    </div>
  );
}

export function createEmptyFitFeedback() {
  return { overall_fit: '', issues: [], notes: '' };
}
