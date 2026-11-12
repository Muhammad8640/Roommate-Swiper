import { useState, useEffect } from "react";
import { Sliders, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export default function PreferencesView({ token, onPreferencesSaved }) {
  const [questionnaire, setQuestionnaire] = useState(null);
  const [answers, setAnswers] = useState({});
  const [nonNegotiables, setNonNegotiables] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load the server catalog and saved answers before allowing edits.
  useEffect(() => {
    async function fetchPreferences() {
      setLoading(true);
      setError(null);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const catalogResponse = await fetch(`${API_BASE}/questionnaire`, { headers });
        const catalogJson = await catalogResponse.json();
        if (!catalogResponse.ok) throw new Error(catalogJson.error?.message || 'Could not load questions.');
        const catalog = catalogJson.data;
        const initialAnswers = Object.fromEntries(catalog.questions.map(q => [q.id, 0]));
        const res = await fetch(`${API_BASE}/me/preferences`, { headers });
        const json = await res.json();
        if (!res.ok && res.status !== 404) throw new Error(json.error?.message || 'Could not load preferences.');
        const saved = res.ok ? json.data : null;
        if (saved && saved.questionnaireVersion !== catalog.version) throw new Error('Saved questionnaire version is unsupported.');
        setAnswers(saved?.scenarioAnswers || initialAnswers);
        const selected = {};
        for (const [questionId, values] of Object.entries(saved?.nonNegotiables || {})) {
          for (const value of values) selected[`${questionId}-${value}`] = true;
        }
        setNonNegotiables(selected);
        setQuestionnaire(catalog);
      } catch (err) {
        setQuestionnaire(null);
        setError(err.message || 'Could not load preferences.');
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchPreferences();
    else setLoading(false);
  }, [token]);

  const handleOptionChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNonNegotiableToggle = (questionId, value) => {
    setNonNegotiables((prev) => {
      const key = `${questionId}-${value}`;
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = true;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const restrictions = {};
    for (const key of Object.keys(nonNegotiables)) {
      const [questionId, valueStr] = key.split('-');
      (restrictions[questionId] ||= []).push(Number(valueStr));
    }
    const payload = {
      questionnaireVersion: questionnaire.version,
      scenarioAnswers: answers,
      nonNegotiables: restrictions,
    };

    try {
      const res = await fetch(`${API_BASE}/me/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.message || 'Failed to save preferences.');
      }

      setSuccess(true);
      setTimeout(() => {
        if (onPreferencesSaved) {
          onPreferencesSaved();
        }
      }, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
      </div>
    );
  }

  if (!questionnaire) return <p role="alert">{error || 'Sign in to load preferences.'}</p>;

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '32px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', boxSizing: 'border-box', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Sliders style={{ width: '24px', height: '24px', color: 'var(--accent)' }} />
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Roommate Preferences</h2>
      </div>
      <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '24px' }}>
        Choose your own habits with the round buttons. Check Dealbreaker for any habit you cannot accept in a roommate.
      </p>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', fontSize: '14px' }}>
          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '8px', color: '#22c55e', marginBottom: '20px', fontSize: '14px' }}>
          <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span>Preferences saved! Loading matches...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {questionnaire.questions.map((q) => (
          <div key={q.id} style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '15px', marginBottom: '12px', color: 'var(--text-h)' }}>
              {q.prompt}
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt.value;
                const isNonNegChecked = !!nonNegotiables[`${q.id}-${opt.value}`];

                return (
                  <div
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isSelected ? 'var(--accent-bg)' : 'transparent',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border)'
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', flex: 1 }}>
                      <input
                        type="radio"
                        name={q.id}
                        checked={isSelected}
                        onChange={() => handleOptionChange(q.id, opt.value)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span>{opt.label}</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', opacity: 0.85, userSelect: 'none' }} title="Reject roommates who choose this answer">
                      <input
                        type="checkbox"
                        checked={isNonNegChecked}
                        onChange={() => handleNonNegotiableToggle(q.id, opt.value)}
                        style={{ accentColor: '#ef4444' }}
                      />
                      <span>Dealbreaker</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={saving || success}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '14px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: saving || success ? 'not-allowed' : 'pointer',
            marginTop: '10px'
          }}
        >
          {saving && <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />}
          {success ? "Saved!" : "Save & Continue to Matches"}
        </button>
      </form>
    </div>
  );
}