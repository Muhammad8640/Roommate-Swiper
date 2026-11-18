import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, RotateCcw, X, Flag } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { toPreferencesRow, toProfileRow } from "../lib/profileRow";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

async function requestJson(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function SwipeDeck({ token }) {
  const [profiles, setProfiles] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportText, setReportText] = useState("");

  const [reportedProfileIds, setReportedProfileIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("roommate-swiper-reported-profiles") || "[]"
      );
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
  localStorage.setItem(
    "roommate-swiper-reported-profiles",
    JSON.stringify(reportedProfileIds)
  );
}, [reportedProfileIds]);
  const loadProfiles = useCallback(async () => {
  setLoading(true);
  setError("");
  setNotice("");

  try {
    const result = await requestJson("/discover?limit=10", token);

    if (!result.ok) {
      const missing = result.json.error?.details?.missingFields;

      if (result.status === 409 && missing) {
        setError(`Finish your ${missing.join(", ")} before browsing profiles.`);
      } else {
        setError(result.json.error?.message || "Could not load other profiles.");
      }

      setProfiles([]);
      return;
    }

    setProfiles(
      (result.json.data ?? [])
        .map((item) => ({
          profile: toProfileRow({
            ...item,
            compatibility_score: item.score,
          }),
          preferences: toPreferencesRow(item),
        }))
        .filter(
          (item) =>
            !reportedProfileIds.includes(item.profile.user_id)
        )
    );
  } catch {
    setError("Could not reach the server. Make sure the backend is running.");
    setProfiles([]);
  } finally {
    setLoading(false);
  }
}, [token, reportedProfileIds]);

  useEffect(() => {
    if (token) loadProfiles();
    else {
      setLoading(false);
      setError("Please sign in to discover roommates.");
    }
  }, [token, loadProfiles]);

  async function handleSwipe(direction) {
    const current = profiles[0];
    function submitReport(event) {
  event.preventDefault();

  if (!reportTarget || !reportText.trim()) return;

  const profileName = reportTarget.display_name || "Unknown profile";
  const profileId = reportTarget.user_id;

  const subject = `Roommate Swiper report: ${profileName}`;

  const body = [
    `Profile: ${profileName}`,
    `Profile ID: ${profileId}`,
    "",
    "Report details:",
    reportText.trim(),
  ].join("\n");

  window.location.href =
    `mailto:mraza22@gmu.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  setReportedProfileIds((ids) => [...new Set([...ids, profileId])]);

  setProfiles((items) =>
    items.filter((item) => item.profile.user_id !== profileId)
  );

  setReportTarget(null);
  setReportText("");

  setNotice(
    "This profile has been removed. Your email draft is ready. Please send it from your email app."
  );
}
    if (!current || swiping) return;

    setSwiping(true);
    setError("");
    setNotice("");
    try {
      const result = await requestJson("/swipes", token, {
        method: "POST",
        body: JSON.stringify({
          targetId: current.profile.user_id,
          direction,
        }),
      });

      if (!result.ok) {
        setError(result.json.error?.message || "Could not save your swipe.");
        return;
      }

      if (result.json.data?.matched) {
        setNotice("It's a match! You both liked each other.");
      }
      setProfiles((currentProfiles) => currentProfiles.slice(1));
    } catch {
      setError("Could not reach the server. Your swipe was not saved.");
    } finally {
      setSwiping(false);
    }
  }

  const current = profiles[0];

  return (
    <div className="swipe-page" style={{ width: "100%", maxWidth: "500px", margin: "0 auto", padding: "32px 18px", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <p style={{ color: "#8b42c8", fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "7px" }}>Roommate discovery</p>
        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 800, letterSpacing: "-0.6px" }}>Find your next roommate</h2>
        <p style={{ color: "#777080", fontSize: "14px", marginTop: "7px" }}>Get to know students and see how compatible your lifestyles are.</p>
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {error && <p role="alert" style={{ textAlign: "center", color: "#dc2626", fontSize: "14px", margin: "12px 0" }}>{error}</p>}
      {notice && <p role="status" style={{ textAlign: "center", color: "#7e22ce", fontWeight: 700, fontSize: "14px", margin: "12px 0" }}>{notice}</p>}

      {!loading && current && (
        <>
          <div className="rc-deck">
            <ProfileCard
              key={current.profile.user_id}
              profile={current.profile}
              preferences={current.preferences}
              onReport={setReportTarget}
            />
          </div>
          <div className="swipe-actions" style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "20px" }}>
            <button type="button" onClick={() => handleSwipe("left")} disabled={swiping} aria-label="Pass" style={swipeButtonStyle("#fff1f2", "#e11d48")}>
              <X size={28} />
            </button>
            <button type="button" onClick={() => handleSwipe("right")} disabled={swiping} aria-label="Like" style={swipeButtonStyle("#f3e8ff", "#9333ea")}>
              <Heart size={26} fill="currentColor" />
            </button>
          </div>
          {swiping && <p style={{ textAlign: "center", color: "#777080", fontSize: "12px", marginTop: "10px" }}>Saving your swipe…</p>}
        </>
      )}

      {!loading && !current && !error && (
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <h3 style={{ color: "var(--text-h)", margin: "0 0 8px" }}>You're all caught up!</h3>
          <p style={{ color: "var(--text)", fontSize: "14px", marginBottom: "18px" }}>There are no more compatible profiles to show right now.</p>
          <button type="button" onClick={loadProfiles} style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: 0, borderRadius: "10px", padding: "10px 16px", color: "#fff", background: "var(--accent)", cursor: "pointer" }}>
            <RotateCcw size={16} /> Refresh profiles
          </button>
        </div>
      )}
          {reportTarget && (
        <div className="rc-report-backdrop">
          <form
            className="rc-report-dialog"
            onSubmit={submitReport}
          >
            <div className="rc-report-heading">
              <Flag size={18} />
              <div>
                <h3>Report profile</h3>
                <p>
                  Tell us why you're reporting{" "}
                  {reportTarget.display_name || "this profile"}.
                </p>
              </div>
            </div>

            <label htmlFor="rc-report-details">
              Report details
            </label>

            <textarea
              id="rc-report-details"
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
              placeholder="Describe the issue..."
              rows={5}
              maxLength={3000}
              required
            />

            <div className="rc-report-actions">
              <button
                type="button"
                className="rc-report-cancel"
                onClick={() => {
                  setReportTarget(null);
                  setReportText("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rc-report-submit"
                disabled={!reportText.trim()}
              >
                <Flag size={15} /> Continue to email
              </button>
            </div>

            <p className="rc-report-note">
              Your email app will open with the report addressed to
              mraza22@gmu.edu. You must press Send to submit it.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

function swipeButtonStyle(background, color) {
  return {
    width: "62px",
    height: "62px",
    display: "grid",
    placeItems: "center",
    border: "1px solid #eee8f5",
    borderRadius: "50%",
    background,
    color,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(38, 24, 59, 0.12)",
  };
}
