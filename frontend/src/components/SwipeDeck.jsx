import React, { useState, useEffect } from 'react';
import { Heart, X, User, Loader2, Sparkles, BookOpen, GraduationCap } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export default function SwipeDeck({ token }) {
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSwipeQueue() {
      try {
        const res = await fetch(`${API_BASE}/profiles`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Failed to load potential roommates');
        }

        setProfiles(json.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchSwipeQueue();
  }, [token]);

  const handleSwipe = async (action) => {
    if (currentIndex >= profiles.length || actionLoading) return;

    const targetProfile = profiles[currentIndex];
    setActionLoading(true);

    try {
      await fetch(`${API_BASE}/swipes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: targetProfile.id || targetProfile.userId,
          action: action,
        }),
      });
    } catch (err) {
      console.error('Failed to record swipe:', err);
    } finally {
      setActionLoading(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '80vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div style={{
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto',
      padding: '24px 16px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ width: '100%', textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>Find Roommates</h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Discover students looking for a place near campus.
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          borderRadius: '8px',
          fontSize: '14px',
          width: '100%'
        }}>
          {error}
        </div>
      )}

      <div style={{
        width: '100%',
        height: '520px',
        background: 'var(--card-bg, #ffffff)',
        borderRadius: '20px',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {currentProfile && currentIndex < profiles.length ? (
          <>
            <div style={{ width: '100%', height: '280px', position: 'relative', background: '#f1f5f9' }}>
              {currentProfile.avatarUrl || currentProfile.photoUrl ? (
                <img
                  src={currentProfile.avatarUrl || currentProfile.photoUrl}
                  alt={currentProfile.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <User style={{ width: '64px', height: '64px' }} />
                </div>
              )}
            </div>

            <div style={{ padding: '16px', textAlign: 'left', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                    {currentProfile.displayName}
                  </h3>
                  {currentProfile.classYear && (
                    <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GraduationCap style={{ width: '14px', height: '14px' }} /> '{String(currentProfile.classYear).slice(-2)}
                    </span>
                  )}
                </div>

                {currentProfile.major && (
                  <p style={{ margin: '4px 0 8px 0', fontSize: '13px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen style={{ width: '14px', height: '14px' }} /> {currentProfile.major}
                  </p>
                )}

                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {currentProfile.bio || 'No bio provided yet.'}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {currentProfile.interests?.slice(0, 4).map((interest) => (
                    <span
                      key={interest}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: 'rgba(79, 70, 229, 0.1)',
                        color: '#4f46e5',
                      }}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', paddingTop: '8px' }}>
                <button
                  onClick={() => handleSwipe('pass')}
                  disabled={actionLoading}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <X style={{ width: '22px', height: '22px' }} />
                </button>
                <button
                  onClick={() => handleSwipe('like')}
                  disabled={actionLoading}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#4f46e5',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <Heart style={{ width: '22px', height: '22px' }} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <Sparkles style={{ width: '48px', height: '48px', color: '#4f46e5', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>You're all caught up!</h3>
            <p style={{ fontSize: '14px', margin: 0 }}>Check back later for new roommate profiles in your area.</p>
          </div>
        )}
      </div>
    </div>
  );
}