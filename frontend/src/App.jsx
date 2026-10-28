import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import ProfileManager from "./components/ProfileManager";
import { ShieldCheck } from "lucide-react";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  // Render ProfileManager when an active session exists
  if (session) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <header className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Roommate Swiper — Profile Setup
          </h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
          >
            Sign Out
          </button>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <ProfileManager token={session.access_token} />
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
