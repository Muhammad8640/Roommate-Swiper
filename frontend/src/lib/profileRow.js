// Column names exactly as they appear in the Supabase `roommate` schema:
//
//   roommate.profiles     user_id, display_name, bio, major, class_year, interests, created_at, updated_at
//   roommate.photos       id, user_id, object_key, position (1-3)
//   roommate.preferences  user_id, questionnaire_version, scenario_answers, non_negotiables, updated_at
//
// The Express API aliases those columns to camelCase (displayName, classYear, ...)
// and replaces photos.object_key with a short-lived signed `url`. The `roommate`
// schema is locked away from the browser Supabase client (RLS + REVOKE in
// migrations 001/002), so the frontend must read through Express. These helpers
// convert the API response back to the column names so components only ever
// deal with the schema's own names.

export function toProfileRow(api = {}) {
  return {
    user_id: api.user_id ?? api.userId ?? null,
    display_name: api.display_name ?? api.displayName ?? "",
    bio: api.bio ?? "",
    major: api.major ?? null,
    class_year: api.class_year ?? api.classYear ?? null,
    interests: api.interests ?? [],
    photos: [...(api.photos ?? [])]
      .map((photo) => ({
        id: photo.id,
        position: photo.position,
        url: photo.url ?? null, // signed URL standing in for photos.object_key
      }))
      .sort((a, b) => a.position - b.position),
  };
}

export function toPreferencesRow(api) {
  if (!api) return null;
  return {
    user_id: api.user_id ?? api.userId ?? null,
    questionnaire_version: api.questionnaire_version ?? api.questionnaireVersion ?? 1,
    scenario_answers: api.scenario_answers ?? api.scenarioAnswers ?? null,
  };
}
