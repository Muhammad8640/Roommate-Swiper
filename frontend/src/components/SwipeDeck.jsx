import { useEffect, useState } from "react";
import { Loader2, Heart, X, Sparkles } from "lucide-react";
import ProfileCard from "./ProfileCard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

async function getJson(path, token) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function SwipeDeck({ token, onViewMatches }) {
  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [swiping, setSwiping] = useState(false);
  const [newMatch, setNewMatch] = useState(null);

  useEffect(() => {
    setNewMatch(null);
    let cancelled = false;

    async function loadFeed() {
      try {
        const res = await getJson("/profiles?limit=10&offset=0", token);

        if (cancelled) return;

        if (!res.ok) {
          setError(res.json.error?.message || "Could not load roommate profiles.");
        } else {
          const rawList = Array.isArray(res.json) ? res.json : (res.json.data || []);
          
          // Map incoming profile items directly
          const formatted = rawList.map((item) => ({
            profile: {
              display_name: item.displayName || item.display_name || item.profile?.displayName || "Roommate",
              bio: item.bio || item.profile?.bio || "",
              major: item.major || item.profile?.major,
              class_year: item.classYear || item.class_year || item.profile?.classYear,
              interests: item.interests || item.profile?.interests || [],
              photos: item.photos || item.profile?.photos || (item.avatarUrl ? [{ url: item.avatarUrl }] : []),
            },
            preferences: item.preferences || item.scenario_answers ? {
              scenario_answers: item.preferences?.scenarioAnswers || item.preferences?.scenario_answers || item.scenario_answers
            } : null,
            userId: item.id || item.user_id || item.profile?.id,
          }));

          setCandidates(formatted);
        }
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) loadFeed();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSwipe = async (action) => {
    if (swiping || candidates.length === 0) return;
    const currentCandidate = candidates[currentIndex];
    const targetUserId = currentCandidate?.userId;

    setSwiping(true);
    try {
      if (targetUserId) {
        const response = await fetch(`${API_BASE}/swipes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUserId: targetUserId,
            action: action, // 'like' or 'pass'
          }),
        });
        const result = await response.json();
        if (response.ok && result.data?.matched) {
          setNewMatch({
            displayName: result.data.match?.displayName || currentCandidate.profile.display_name,
          });
        }
      }
    } catch (err) {
      console.error("Failed to record swipe action", err);
    } finally {
      setSwiping(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const currentCard = candidates[currentIndex];

  return (
    <div style={{ width: "100%", maxWidth: "500px", margin: "0 auto", padding: "32px 18px", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <p style={{ color: "var(--accent, #4f46e5)", fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "7px" }}>Roommate discovery</p>
        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 800, letterSpacing: "-0.6px" }}>Find your next roommate</h2>
        <p style={{ color: "#777080", fontSize: "14px", marginTop: "7px" }}>Get to know students and see if your lifestyles match.</p>
      </div>

      {newMatch && (
        <section role="status" aria-live="polite" style={{
          padding: "20px", marginBottom: "20px", textAlign: "center",
          border: "2px solid var(--accent, #8b42c8)", borderRadius: "16px",
          background: "var(--card-bg, #ffffff)",
        }}>
          <Heart size={28} color="var(--accent, #8b42c8)" style={{ margin: "0 auto" }} />
          <h3 style={{ margin: "8px 0" }}>You matched!</h3>
          <p>You and {newMatch.displayName || "another student"} liked each other.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <button type="button" onClick={() => setNewMatch(null)}>Dismiss</button>
            {onViewMatches && (
              <button type="button" onClick={() => {
                setNewMatch(null);
                onViewMatches();
              }}>View Matches</button>
            )}
          </div>
        </section>
      )}

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {error && !currentCard && (
        <div
          role="alert"
          style={{
            background: "var(--card-bg, #ffffff)",
            border: "1px solid #fecaca",
            borderRadius: "16px",
            padding: "32px 24px",
            textAlign: "center",
            color: "#ef4444",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (!currentCard || currentIndex >= candidates.length) && (
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <Sparkles size={32} color="var(--accent, #4f46e5)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>You've reviewed everyone!</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Check back later for new potential roommates or review your matches tab.</p>
        </div>
      )}

      {currentCard && (
        <>
          <div className="rc-deck" style={{ marginBottom: "20px" }}>
            <ProfileCard profile={currentCard.profile} preferences={currentCard.preferences} />
          </div>

          {/* Action Buttons: X (Pass) and Heart (Like) */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => handleSwipe("pass")}
              disabled={swiping}
              aria-label="Pass candidate"
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "var(--card-bg, #ffffff)",
                border: "1px solid #ef4444",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                transition: "transform 0.1s ease",
              }}
            >
              <X size={28} />
            </button>

            <button
              type="button"
              onClick={() => handleSwipe("like")}
              disabled={swiping}
              aria-label="Like candidate"
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "var(--accent, #4f46e5)",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                transition: "transform 0.1s ease",
              }}
            >
              <Heart size={28} fill="currentColor" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}