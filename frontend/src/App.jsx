import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import ProfileManager from "./components/ProfileManager";
import MatchesView from "./components/MatchesView";
import SwipeDeck from "./components/SwipeDeck";
import { ShieldCheck, Users, Flame, UserCog } from "lucide-react";
import "./App.css";

const isGmuEmail = (email) => /^[^\s@]+@gmu\.edu$/i.test(email ?? "");

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("signup");
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

  // Also check sessions remembered from an earlier login.
  useEffect(() => {
    if (session && !isGmuEmail(session.user?.email)) {
      setSession(null);
      setMessage("Please use your @gmu.edu school email.");
      supabase.auth.signOut({ scope: "local" });
    }
  }, [session]);

  async function signIn(event) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!isGmuEmail(normalizedEmail)) {
      setMessage("Please use your @gmu.edu school email.");
      return;
    }

    setLoading(true);
    try {
      const credentials = { email: normalizedEmail, password };
      const { data, error } = authMode === "signup"
        ? await supabase.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: window.location.origin },
          })
        : await supabase.auth.signInWithPassword(credentials);

      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        setPassword("");
        setCurrentView("profile");
        setSession(data.session);
      } else {
        setMessage("Check your school email to confirm signup, then sign in with your password.");
        setPassword("");
        setAuthMode("login");
      }
    } catch {
      setMessage("Could not reach Supabase. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Render main application views when an active session exists
  if (session && isGmuEmail(session.user?.email)) {
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
              onProfileSaved={() => setCurrentView("profile")}
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

        <h2>{authMode === "signup" ? "Create account" : "Sign in"}</h2>
        <form onSubmit={signIn}>
          <label htmlFor="email">School email</label>

          <input
            id="email"
            type="email"
            placeholder="you@gmu.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={authMode === "signup" ? "new-password" : "current-password"}
            minLength={authMode === "signup" ? 8 : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button type="button" disabled={loading} onClick={() => {
            setAuthMode(authMode === "signup" ? "login" : "signup");
            setPassword("");
            setMessage("");
          }}>
            {authMode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </form>

        {message && <p role="status">{message}</p>}
      </section>
    </main>
  );
}
