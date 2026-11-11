import React, { useState, useEffect } from 'react';
import {
  User,
  BookOpen,
  GraduationCap,
  FileText,
  Heart,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Camera,
} from 'lucide-react';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export default function ProfileManager({ token, onProfileSaved }) {
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    major: '',
    classYear: new Date().getFullYear(),
    interests: [],
    avatarUrl: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch existing profile data on component mount.
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${API_BASE}/me/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 404) {
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Failed to load profile');
        }

        if (json.data) {
          setFormData({
            displayName: json.data.displayName || '',
            bio: json.data.bio || '',
            major: json.data.major || '',
            classYear: json.data.classYear || new Date().getFullYear(),
            interests: json.data.interests || [],
            avatarUrl: json.data.avatarUrl || json.data.photoUrl || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'classYear' ? (value ? parseInt(value, 10) : null) : value,
    }));
  };

  // Upload photo handler matching express multer route: POST /me/photos
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5242880) {
      setError('Photo size exceeds the 5MB limit.');
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    const bodyData = new FormData();
    bodyData.append('photo', file);

    try {
      const res = await fetch(`${API_BASE}/me/photos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: bodyData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to upload photo');
      }

      const newAvatarUrl = json.data?.url || json.data?.photoUrl || json.data?.id;
      setFormData((prev) => ({
        ...prev,
        avatarUrl: newAvatarUrl,
      }));
      setSuccessMsg('Profile photo updated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddInterest = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    const exists = formData.interests.some(
      (interest) => interest.toLowerCase() === trimmed.toLowerCase(),
    );

    if (!exists && formData.interests.length < 10) {
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, trimmed],
      }));
      setTagInput('');
    }
  };

  const handleRemoveInterest = (toRemove) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((interest) => interest !== toRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE}/me/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          bio: formData.bio || '',
          major: formData.major ? formData.major.trim() : null,
          classYear: formData.classYear ? Number(formData.classYear) : null,
          interests: formData.interests,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.error?.details?.fields) {
          const errMap = {};
          json.error.details.fields.forEach((field) => {
            errMap[field.path] = field.message;
          });
          setFieldErrors(errMap);
        }

        throw new Error(json.error?.message || 'Failed to save profile');
      }

      setSuccessMsg('Profile saved successfully!');

      // Smooth transition over to the Matches view after saving
      setTimeout(() => {
        if (onProfileSaved) {
          onProfileSaved();
        }
      }, 700);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'var(--bg)',
      overflowY: 'auto',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '40px 20px',
      boxSizing: 'border-box',
      zIndex: 999
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'var(--bg)',
        boxShadow: 'var(--shadow)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid var(--border)',
        textAlign: 'left',
        margin: 'auto',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2>Your Roommate Profile</h2>
          <p style={{ color: 'var(--text)', fontSize: '15px', marginTop: '4px' }}>
            Set up how potential roommates will see you on the platform.
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
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            borderRadius: '8px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 style={{ width: '16px', height: '16px' }} /> {successMsg}
          </div>
        )}

        {/* Profile Picture Upload Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ position: 'relative', width: '96px', height: '96px' }}>
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt="Profile"
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent)'
                }}
              />
            ) : (
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'var(--code-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--border)',
                color: 'var(--text)'
              }}>
                <User style={{ width: '40px', height: '40px' }} />
              </div>
            )}

            {/* Upload Badge Button */}
            <label style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: '50%',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow)'
            }}>
              {uploadingPhoto ? (
                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Camera style={{ width: '16px', height: '16px' }} />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text)', marginTop: '8px' }}>
            Click camera to upload photo (Max 5MB)
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Display Name */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '6px' }}>
              <User style={{ width: '16px', height: '16px', color: 'var(--accent)' }} /> Display Name{' '}
              <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="displayName"
              maxLength={80}
              required
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Alex Rivera"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {fieldErrors.displayName && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                {fieldErrors.displayName}
              </p>
            )}
          </div>

          {/* Major */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '6px' }}>
              <BookOpen style={{ width: '16px', height: '16px', color: 'var(--accent)' }} /> Major
            </label>
            <input
              type="text"
              name="major"
              maxLength={100}
              value={formData.major}
              onChange={handleChange}
              placeholder="Computer Science"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {fieldErrors.major && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{fieldErrors.major}</p>
            )}
          </div>

          {/* Class Year */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '6px' }}>
              <GraduationCap style={{ width: '16px', height: '16px', color: 'var(--accent)' }} /> Class Year
            </label>
            <input
              type="number"
              name="classYear"
              min={2000}
              max={2100}
              value={formData.classYear}
              onChange={handleChange}
              placeholder="2027"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {fieldErrors.classYear && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                {fieldErrors.classYear}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '6px' }}>
              <FileText style={{ width: '16px', height: '16px', color: 'var(--accent)' }} /> Bio (Max 500 chars)
            </label>
            <textarea
              name="bio"
              rows="3"
              maxLength={500}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell potential roommates about your living habits, sleep schedule, and cleanliness..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text)', marginTop: '4px' }}>
              {fieldErrors.bio ? (
                <span style={{ color: '#ef4444' }}>{fieldErrors.bio}</span>
              ) : (
                <span />
              )}
              <span>{formData.bio.length}/500</span>
            </div>
          </div>

          {/* Interests */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '6px' }}>
              <Heart style={{ width: '16px', height: '16px', color: 'var(--accent)' }} /> Interests (Max 10)
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                maxLength={30}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
                placeholder="Add interest (e.g. Coding, Gym)"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleAddInterest}
                style={{
                  padding: '8px 16px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                <Plus style={{ width: '16px', height: '16px' }} /> Add
              </button>
            </div>
            {fieldErrors.interests && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>
                {fieldErrors.interests}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {formData.interests.map((interest) => (
                <span
                  key={interest}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)'
                  }}
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <X style={{ width: '12px', height: '12px' }} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: 'var(--shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px'
            }}
          >
            {saving && <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
            Save & Continue to Matches
          </button>
        </form>
      </div>
    </div>
  );
}