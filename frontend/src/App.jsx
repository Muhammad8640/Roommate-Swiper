import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import ProfileManager from "./components/ProfileManager";
import MatchesView from "./components/MatchesView";
import SwipeDeck from "./components/SwipeDeck";
import { ShieldCheck, Users, Flame, UserCog } from "lucide-react";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Navigation state once logged in: 'profile' | 'matches' | 'swipe'
  const [currentView, setCurrentView] = useState("profile");

  // Check active authentication session on mount and listen for state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for your sign-in link.");
    }

    setLoading(false);
  }

  // Render main application views when an active session exists
  if (session) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-h)', fontFamily: 'inherit' }}>
        {/* Navigation / Header Bar */}
        <header style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          boxSizing: 'border-box'
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--accent)' }}>
            <ShieldCheck style={{ width: '20px', height: '20px' }} /> Roommate Swiper
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Quick Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentView("matches")}
                style={{
                  background: currentView === "matches" ? 'var(--accent)' : 'transparent',
                  color: currentView === "matches" ? '#fff' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Users style={{ width: '14px', height: '14px' }} /> Matches
              </button>

              <button
                onClick={() => setCurrentView("swipe")}
                style={{
                  background: currentView === "swipe" ? 'var(--accent)' : 'transparent',
                  color: currentView === "swipe" ? '#fff' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Flame style={{ width: '14px', height: '14px' }} /> Swipe
              </button>

              <button
                onClick={() => setCurrentView("profile")}
                style={{
                  background: currentView === "profile" ? 'var(--accent)' : 'transparent',
                  color: currentView === "profile" ? '#fff' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <UserCog style={{ width: '14px', height: '14px' }} /> Profile
              </button>
            </div>

            <button
              onClick={() => supabase.auth.signOut()}
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dynamic View Renderer */}
        <main>
          {currentView === "profile" && (
            <ProfileManager
              token={session.access_token}
              onProfileSaved={() => setCurrentView("matches")}
            />
          )}

          {currentView === "matches" && (
            <MatchesView
              token={session.access_token}
              onNavigateToSwipe={() => setCurrentView("swipe")}
            />
          )}

          {currentView === "swipe" && (
            <SwipeDeck token={session.access_token} />
          )}
        </main>
      </div>
    );
  }

  // Render Sign-In Page when unauthenticated
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Roommate Swiper</h1>
        <p>Find your next roommate, starting with your school email.</p>

        <form onSubmit={signIn}>
          <label htmlFor="email">School email</label>

          <input
            id="email"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending link..." : "Send sign-in link"}
          </button>
        </form>

        {message && <p role="status">{message}</p>}
      </section>
    </main>
  );
}