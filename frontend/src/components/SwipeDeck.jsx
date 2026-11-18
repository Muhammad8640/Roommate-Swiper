import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { toPreferencesRow, toProfileRow } from "../lib/profileRow";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

async function getJson(path, token) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// Card visual only: no swiping, no like/pass actions.
//
// The backend currently has no endpoint that returns other students' profiles
// (only GET /me/profile and GET /me/preferences), so this renders the signed-in
// student's own card, i.e. exactly what other students will see. When a
// discovery endpoint exists, replace `load()` to fetch that list and map each
// item with toProfileRow(); ProfileCard needs no changes.
export default function SwipeDeck({ token }) {
  const [card, setCard] = useState(null); // { profile, preferences }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, preferences] = await Promise.all([
          getJson("/me/profile", token),
          getJson("/me/preferences", token), // 404 until the questionnaire is saved
        ]);

        if (cancelled) return;

        if (profile.status === 404) {
          setError("Create your profile first, then your card will show up here.");
        } else if (!profile.ok) {
          setError(profile.json.error?.message || "Could not load your profile.");
        } else {
          setCard({
            profile: toProfileRow(profile.json.data),
            preferences: preferences.ok ? toPreferencesRow(preferences.json.data) : null,
          });
        }
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) load();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [token]);

<<<<<<< Updated upstream
=======
  
const handleSwipe = async (action) => {
  if (swiping || candidates.length === 0) return;

  const currentCandidate = candidates[currentIndex];
  const targetUserId = currentCandidate?.userId;

  if (!targetUserId) return;

  setSwiping(true);
  setError("");

  try {
    const response = await fetch(`${API_BASE}/swipes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetId: targetUserId,
        direction: action === "like" ? "right" : "left",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error?.message || "Could not save your swipe."
      );
    }

    // The backend tells us when both users have liked each other.
    if (result.data?.matched) {
      console.log("You matched with:", result.data.match);
    }

    setCurrentIndex((prev) => prev + 1);
  } catch (err) {
    console.error("Failed to record swipe:", err);
    setError(err.message || "Could not save your swipe.");
  } finally {
    setSwiping(false);
  }
};

  const currentCard = candidates[currentIndex];

>>>>>>> Stashed changes
  return (
    <div style={{ width: "100%", maxWidth: "500px", margin: "0 auto", padding: "32px 18px", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <p style={{ color: "#8b42c8", fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "7px" }}>Roommate discovery</p>
        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 800, letterSpacing: "-0.6px" }}>Find your next roommate</h2>
        <p style={{ color: "#777080", fontSize: "14px", marginTop: "7px" }}>Get to know students and see if your lifestyles match.</p>
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {error && (
<<<<<<< Updated upstream
        <p role="alert" style={{ textAlign: "center", fontSize: "14px", color: "#ef4444" }}>
=======
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
>>>>>>> Stashed changes
          {error}
        </p>
      )}

      {card && (
        <div className="rc-deck">
          <ProfileCard profile={card.profile} preferences={card.preferences} />
        </div>
      )}
    </div>
  );
}
