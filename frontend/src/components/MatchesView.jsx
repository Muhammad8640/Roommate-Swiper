import React, { useState, useEffect } from 'react';
import { Users, Loader2, Sparkles, MessageSquare } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export default function MatchesView({ token, onNavigateToSwipe }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch(`${API_BASE}/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setMatches([]);
          setLoading(false);
          return;
        }

        const json = await res.json();
        setMatches(json.data || []);
      } catch (err) {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchMatches();
    else setLoading(false);
  }, [token]);

  if (loading) {
    return (
      <div style={{
        minHeight: '80vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: 'var(--indigo-600, #4f46e5)' }} />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '24px 16px',
      boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px 0' }}>Your Matches</h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Connect with potential roommates who liked your profile back.
        </p>
      </div>

      {matches.length === 0 ? (
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(79, 70, 229, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#4f46e5'
          }}>
            <Users style={{ width: '32px', height: '32px' }} />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>
            You have no current matches
          </h3>

          <p style={{
            fontSize: '14px',
            color: '#64748b',
            maxWidth: '340px',
            margin: '0 0 24px 0',
            lineHeight: '1.5'
          }}>
            Keep swiping on roommate profiles! When someone you like likes you back, they'll show up right here.
          </p>

          {onNavigateToSwipe && (
            <button
              onClick={onNavigateToSwipe}
              style={{
                padding: '12px 24px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles style={{ width: '16px', height: '16px' }} /> Start Swiping
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {matches.map((match) => (
            <div
              key={match.id}
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <img
                src={match.avatarUrl || '/default-avatar.png'}
                alt={match.displayName}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{match.displayName}</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{match.major}</p>
              </div>
              <button style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer' }}>
                <MessageSquare style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}