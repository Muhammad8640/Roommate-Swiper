
import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, RotateCcw, X, Flag } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { toPreferencesRow, toProfileRow } from "../lib/profileRow";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

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
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Report states
  const [reportTarget, setReportTarget] = useState(null);
  const [reportText, setReportText] = useState("");

  // Remember reported profiles in this browser
  const [reportedProfileIds, setReportedProfileIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("roommate-swiper-reported-profiles") || "[]"
      );
    } catch {
      return [];
    }
  });

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
          setError(
            `Finish your ${missing.join(", ")} before browsing profiles.`
          );
        } else {
          setError(
            result.json.error?.message || "Could not load other profiles."
          );
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
    if (token) {
      loadProfiles();
    } else {
      setLoading(false);
      setError("Please sign in to discover roommates.");
    }
  }, [token, loadProfiles]);

  async function handleSwipe(direction) {
    const current = profiles[0];
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

  // Submit a report
  function submitReport(event) {
    event.preventDefault();

    if (!reportTarget || !reportText.trim()) return;

    const profileId = reportTarget.user_id;
    const profileName = reportTarget.display_name || "Unknown profile";

    const subject = `Roommate Swiper Report: ${profileName}`;

    const body = [
      `Reported profile: ${profileName}`,
      `Profile ID: ${profileId || "Unknown"}`,
      "",
      "Reason for report:",
      reportText.trim(),
    ].join("\n");

    // Open an email draft addressed to the administrator
    window.location.href =
      `mailto:mraza22@gmu.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Hide this profile from this browser's swiping deck
    if (profileId) {
      setReportedProfileIds((ids) =>
        [...new Set([...ids, profileId])]
      );

      setProfiles((items) =>
        items.filter((item) => item.profile.user_id !== profileId)
      );
    }

    setReportTarget(null);
    setReportText("");

    setNotice(
      "The profile has been removed from your deck. Please send the report from your email app."
    );
  }

  const current = profiles[0];

  return (
    <div
      className="swipe-page"
      style={{
        width: "100%",
        maxWidth: "500px",
        margin: "0 auto",
        padding: "32px 18px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <p
          style={{
            color: "#8b42c8",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "7px",
          }}
        >
          Roommate discovery
        </p>

        <h2
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: "-0.6px",
          }}
        >
          Find your next roommate
        </h2>

        <p style={{ color: "#777080", fontSize: "14px", marginTop: "7px" }}>
          Get to know students and see how compatible your lifestyles are.
        </p>
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "48px 0",
          }}
        >
          <Loader2
            size={32}
            color="var(--accent)"
            style={{ animation: "spin 1s linear infinite" }}
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          style={{
            textAlign: "center",
            color: "#dc2626",
            fontSize: "14px",
            margin: "12px 0",
          }}
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          style={{
            textAlign: "center",
            color: "#7e22ce",
            fontWeight: 700,
            fontSize: "14px",
            margin: "12px 0",
          }}
        >
          {notice}
        </p>
      )}

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

          <div
            className="swipe-actions"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => handleSwipe("left")}
              disabled={swiping}
              aria-label="Pass"
              style={swipeButtonStyle("#fff1f2", "#e11d48")}
            >
              <X size={28} />
            </button>

            <button
              type="button"
              onClick={() => handleSwipe("right")}
              disabled={swiping}
              aria-label="Like"
              style={swipeButtonStyle("#f3e8ff", "#9333ea")}
            >
              <Heart size={26} fill="currentColor" />
            </button>
          </div>

          {swiping && (
            <p
              style={{
                textAlign: "center",
                color: "#777080",
                fontSize: "12px",
                marginTop: "10px",
              }}
            >
              Saving your swipe…
            </p>
          )}
        </>
      )}

      {!loading && !current && !error && (
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <h3 style={{ color: "var(--text-h)", margin: "0 0 8px" }}>
            You're all caught up!
          </h3>

          <p
            style={{
              color: "var(--text)",
              fontSize: "14px",
              marginBottom: "18px",
            }}
          >
            There are no more compatible profiles to show right now.
          </p>

          <button
            type="button"
            onClick={loadProfiles}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: 0,
              borderRadius: "10px",
              padding: "10px 16px",
              color: "#fff",
              background: "var(--accent)",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={16} /> Refresh profiles
          </button>
        </div>
      )}

      {/* Report popup */}
      {reportTarget && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setReportTarget(null);
              setReportText("");
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={submitReport}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              boxSizing: "border-box",
              boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h3 id="report-title" style={{ marginTop: 0 }}>
              <Flag size={18} style={{ verticalAlign: "middle" }} /> Report
              Profile
            </h3>

            <p style={{ color: "#666", fontSize: "14px" }}>
              Tell us why you're reporting{" "}
              <strong>{reportTarget.display_name || "this profile"}</strong>.
            </p>

            <textarea
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
              placeholder="Explain the reason for your report..."
              rows={5}
              maxLength={3000}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                resize: "vertical",
                font: "inherit",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setReportTarget(null);
                  setReportText("");
                }}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!reportText.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  border: 0,
                  borderRadius: "8px",
                  background: "#8b42c8",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: reportText.trim() ? 1 : 0.5,
                }}
              >
                <Flag size={15} /> Continue to email
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#777", marginBottom: 0 }}>
              Your email application will open addressed to
              mraza22@gmu.edu. You must press Send to submit the report.
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