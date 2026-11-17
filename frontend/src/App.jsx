import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import ProfileManager from "./components/ProfileManager";
import PreferencesView from "./components/PreferencesView";
import MatchesView from "./components/MatchesView";
import SwipeDeck from "./components/SwipeDeck";
import { ShieldCheck, Users, Flame, UserCog, Sliders } from "lucide-react";
import "./App.css";

const isGmuEmail = (email) => /^[^\s@]+@gmu\.edu$/i.test(email ?? "");

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("signup");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Navigation state: 'profile' | 'preferences' | 'matches' | 'swipe'
  const [currentView, setCurrentView] = useState("profile");

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

  useEffect(() => {
    if (session && !isGmuEmail(session.user?.email)) {
      setSession(null);
      setMessage("Please use your @gmu.edu school email.");
      supabase.auth.signOut({ scope: "local" });
    }
  }, [session]);

  async function handleAuth(event) {
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

  if (session && isGmuEmail(session.user?.email)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-h)', fontFamily: 'inherit' }}>
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
            <div style={{ display: 'flex', gap: '8px' }}>
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

              <button
                onClick={() => setCurrentView("preferences")}
                style={{
                  background: currentView === "preferences" ? 'var(--accent)' : 'transparent',
                  color: currentView === "preferences" ? '#fff' : 'var(--text)',
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
                <Sliders style={{ width: '14px', height: '14px' }} /> Preferences
              </button>

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
            </div>

            <button
              onClick={() => supabase.auth.signOut()}
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </header>

        <main>
          {currentView === "profile" && (
            <ProfileManager
              token={session.access_token}
              onProfileSaved={() => setCurrentView("preferences")}
            />
          )}

          {currentView === "preferences" && (
            <PreferencesView
              token={session.access_token}
              onPreferencesSaved={() => setCurrentView("matches")}
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

  return (
    <main className="auth-page" style={{ background: 'var(--bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <section className="auth-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)', marginBottom: '8px' }}>Roommate Swiper</h1>
        <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '24px' }}>Find your next roommate using your @gmu.edu school email.</p>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>School Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@gmu.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Password</label>
            <input
              id="password"
              type="password"
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              minLength={authMode === "signup" ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {loading ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setAuthMode(authMode === "signup" ? "login" : "signup");
              setPassword("");
              setMessage("");
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {authMode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </form>

        {message && <p role="status" style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text)' }}>{message}</p>}
      </section>
    </main>
  );
}
