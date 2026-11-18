import { useEffect, useState } from "react";
import { Users, Loader2, Sparkles, Mail, Phone } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function MatchesView({ token, onNavigateToSwipe }) {
  const [matches, setMatches] = useState([]);
  const [expandedContacts, setExpandedContacts] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchMatches() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE}/me/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            json.error?.message || "Could not load your matches."
          );
        }

        const rows = Array.isArray(json.data) ? json.data : [];

        const scoredMatches = await Promise.all(
          rows.map(async (match) => {
            try {
              const scoreResponse = await fetch(
                `${API_BASE}/me/compatibility/${encodeURIComponent(match.userId)}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const scoreJson = await scoreResponse.json().catch(() => ({}));

              return {
                ...match,
                compatibilityScore: scoreResponse.ok
                  ? scoreJson.data?.score ?? null
                  : null,
              };
            } catch {
              return { ...match, compatibilityScore: null };
            }
          })
        );

        scoredMatches.sort(
          (a, b) =>
            (b.compatibilityScore ?? -1) - (a.compatibilityScore ?? -1)
        );

        if (!cancelled) {
          setMatches(scoredMatches);
          setExpandedContacts(new Set());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load your matches.");
          setMatches([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) {
      fetchMatches();
    } else {
      setMatches([]);
      setError("Please sign in to see your matches.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  function toggleContactInfo(userId) {
    setExpandedContacts((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "80vh",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Loader2
          aria-label="Loading matches"
          style={{
            width: "32px",
            height: "32px",
            animation: "spin 1s linear infinite",
            color: "var(--indigo-600, #4f46e5)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 4px" }}>
          Your Matches
        </h2>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Connect with roommates who liked your profile back.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          style={{ textAlign: "center", color: "#dc2626", fontSize: "14px" }}
        >
          {error}
        </p>
      )}

      {!error && matches.length === 0 && (
        <div
          style={{
            background: "var(--card-bg, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "16px",
            padding: "48px 24px",
            textAlign: "center",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Users
            style={{
              width: "32px",
              height: "32px",
              color: "#4f46e5",
              marginBottom: "16px",
            }}
          />
          <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 8px" }}>
            You have no current matches
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "#64748b",
              maxWidth: "340px",
              margin: "0 auto 24px",
              lineHeight: "1.5",
            }}
          >
            When someone you like likes you back, they’ll appear here.
          </p>

          {onNavigateToSwipe && (
            <button
              type="button"
              onClick={onNavigateToSwipe}
              style={{
                padding: "12px 24px",
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Sparkles size={16} />
              Start Swiping
            </button>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {matches.map((match) => {
            const contactsVisible = expandedContacts.has(match.userId);

            return (
              <article
                key={match.userId}
                style={{
                  background: "var(--card-bg, #ffffff)",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: "48px",
                    height: "48px",
                    flex: "0 0 48px",
                    borderRadius: "50%",
                    background: "rgba(79, 70, 229, 0.1)",
                    color: "#4f46e5",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  {initials(match.displayName) || "?"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>
                    {match.displayName || "Roommate"}
                  </h3>

                  {match.compatibilityScore != null && (
                    <p
                      style={{
                        margin: "0 0 10px",
                        color: "#4f46e5",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      {match.compatibilityScore}% compatible
                    </p>
                  )}

                  <button
                    type="button"
                    aria-expanded={contactsVisible}
                    onClick={() => toggleContactInfo(match.userId)}
                    style={{
                      padding: "8px 12px",
                      background: "#4f46e5",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {contactsVisible ? "Hide contact info" : "Show contact info"}
                  </button>

                  {contactsVisible && (
                    <div style={{ marginTop: "12px" }}>
                      {match.email && (
                        <a
                          href={`mailto:${match.email}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "8px",
                            color: "#4f46e5",
                            fontSize: "14px",
                            overflowWrap: "anywhere",
                          }}
                        >
                          <Mail size={16} />
                          {match.email}
                        </a>
                      )}

                      {match.phone && (
                        <a
                          href={`tel:${match.phone}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#4f46e5",
                            fontSize: "14px",
                          }}
                        >
                          <Phone size={16} />
                          {match.phone}
                        </a>
                      )}

                      {!match.email && !match.phone && (
                        <p
                          style={{
                            margin: 0,
                            color: "#64748b",
                            fontSize: "14px",
                          }}
                        >
                          Contact details are unavailable.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}