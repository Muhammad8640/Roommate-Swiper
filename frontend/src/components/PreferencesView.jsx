import { useState, useEffect } from "react";
import { Sliders, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Version 1 shared contract
const scenarios = [
  ['cleanliness', 'A shared counter is messy after dinner. When would you clean it?', ['Immediately', 'By the end of the day', 'Within a few days', 'During the weekly cleanup']],
  ['sleep', 'On a typical class night, when do you settle down to sleep?', ['Before 10 pm', 'Between 10 pm and midnight', 'Between midnight and 2 am', 'After 2 am']],
  ['noise', 'Your roommate is studying in the room. What sound level fits your usual routine?', ['Keep the room silent', 'Use headphones and keep conversation brief', 'Play quiet background audio', 'Continue normal music and conversation']],
  ['guests', 'How often would you normally invite guests into the shared room?', ['Never', 'About once a month', 'About once a week', 'Most days']],
  ['smoking', 'Which smoking or vaping routine describes you?', ['I do neither', 'Occasionally, outside only', 'Frequently, outside only', 'I would smoke or vape indoors']],
  ['sharing', 'Your roommate wants to use your belongings. What arrangement works for you?', ['Keep belongings separate', 'Ask permission each time', 'Share agreed everyday supplies', 'Share most everyday belongings freely']]
];

const QUESTIONNAIRE_VERSION = 1;
const questionnaire = {
  version: QUESTIONNAIRE_VERSION,
  questions: scenarios.map(([id, prompt, options]) => ({
    id,
    prompt,
    options: options.map((label, value) => ({ value, label }))
  }))
};

export default function PreferencesView({ token, onPreferencesSaved }) {
  const [answers, setAnswers] = useState({});
  const [nonNegotiables, setNonNegotiables] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load existing preferences if available, otherwise default to index 0
  useEffect(() => {
    async function fetchPreferences() {
      const initialAnswers = {};
      questionnaire.questions.forEach((q) => {
        initialAnswers[q.id] = 0;
      });

      try {
        const res = await fetch(`${API_BASE}/me/preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data?.answers) {
            setAnswers({ ...initialAnswers, ...json.data.answers });
          } else {
            setAnswers(initialAnswers);
          }

          if (Array.isArray(json.data?.nonNegotiableChoices)) {
            const loadedNonNeg = {};
            json.data.nonNegotiableChoices.forEach(({ questionId, value }) => {
              loadedNonNeg[`${questionId}-${value}`] = true;
            });
            setNonNegotiables(loadedNonNeg);
          }
        } else {
          setAnswers(initialAnswers);
        }
      } catch {
        setAnswers(initialAnswers);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchPreferences();
    } else {
      setLoading(false);
    }
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

    const payload = {
      version: questionnaire.version,
      answers,
      nonNegotiableChoices: Object.keys(nonNegotiables).map((key) => {
        const [questionId, valueStr] = key.split('-');
        return { questionId, value: parseInt(valueStr, 10) };
      }),
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

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '32px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', boxSizing: 'border-box', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Sliders style={{ width: '24px', height: '24px', color: 'var(--accent)' }} />
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Roommate Preferences</h2>
      </div>
      <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '24px' }}>
        Configure your daily habits and mark any absolute dealbreakers to calibrate your matching engine.
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

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', opacity: 0.85, userSelect: 'none' }} title="Mark as non-negotiable dealbreaker">
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