
import { useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

export default App;