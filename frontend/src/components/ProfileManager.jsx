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
} from 'lucide-react';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export default function ProfileManager({ token }) {
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    major: '',
    classYear: new Date().getFullYear(),
    interests: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          // Uninitialized profile state for initial creation.
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

  const handleAddInterest = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    // Case-insensitive uniqueness enforcement and 10-item restriction.
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Profile Creation
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Set up how potential roommates will see you on the platform.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" /> Display Name{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="displayName"
              maxLength={80}
              required
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Alex Rivera"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
            />
            {fieldErrors.displayName && (
              <p className="text-xs text-rose-500 mt-1">
                {fieldErrors.displayName}
              </p>
            )}
          </div>

          {/* Grid Layout for Major & Class Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Major */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Major
              </label>
              <input
                type="text"
                name="major"
                maxLength={100}
                value={formData.major}
                onChange={handleChange}
                placeholder="Computer Science"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
              />
              {fieldErrors.major && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.major}</p>
              )}
            </div>

            {/* Class Year */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-500" /> Class Year
              </label>
              <input
                type="number"
                name="classYear"
                min={2000}
                max={2100}
                value={formData.classYear}
                onChange={handleChange}
                placeholder="2027"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
              />
              {fieldErrors.classYear && (
                <p className="text-xs text-rose-500 mt-1">
                  {fieldErrors.classYear}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" /> Bio
            </label>
            <textarea
              name="bio"
              rows="3"
              maxLength={500}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell potential roommates about your living habits, sleep schedule, and cleanliness..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm resize-none"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              {fieldErrors.bio ? (
                <span className="text-rose-500">{fieldErrors.bio}</span>
              ) : (
                <span />
              )}
              <span className={formData.bio.length > 450 ? 'text-amber-500' : ''}>
                {formData.bio.length}/500
              </span>
            </div>
          </div>

          {/* Interests */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Heart className="w-4 h-4 text-indigo-500" /> Interests
              </label>
              <span className="text-xs text-slate-400">Max 10</span>
            </div>

            {/* Tag Badges Container */}
            <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              {formData.interests.length === 0 && (
                <span className="text-xs text-slate-400 italic px-1 py-1">No interests added yet</span>
              )}
              {formData.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    className="hover:text-rose-500 focus:outline-none rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
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
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
              />
              <button
                type="button"
                onClick={handleAddInterest}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition flex items-center gap-1 font-medium text-sm shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {fieldErrors.interests && (
              <p className="text-xs text-rose-500 mt-1">
                {fieldErrors.interests}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition transform active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}