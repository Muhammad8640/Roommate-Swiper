import { useState } from "react";
import {
  BookOpen,
  Cigarette,
  GraduationCap,
  Handshake,
  Moon,
  Sparkles,
  Users,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";
import "./ProfileCard.css";

// Labels correspond to questionnaire version 1 (answers 0-3).
const LIFESTYLE = [
  { key: "cleanliness", Icon: Sparkles, title: "Cleanliness", labels: ["Cleans right away", "Cleans by end of day", "Cleans within days", "Weekly cleanup"] },
  { key: "sleep", Icon: Moon, title: "Sleep schedule", labels: ["Before 10 pm", "10 pm – midnight", "Midnight – 2 am", "After 2 am"] },
  { key: "noise", Icon: Volume2, title: "Noise", labels: ["Very quiet", "Mostly headphones", "Quiet background audio", "Normal music & talking"] },
  { key: "guests", Icon: Users, title: "Guests", labels: ["No guests", "Guests monthly", "Guests weekly", "Guests most days"] },
  { key: "smoking", Icon: Cigarette, title: "Smoking", labels: ["No smoking or vaping", "Occasionally, outside", "Frequently, outside", "Indoors"] },
  { key: "sharing", Icon: Handshake, title: "Sharing", labels: ["Keeps things separate", "Asks first", "Shares agreed supplies", "Shares freely"] },
];

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileCard({ profile = {}, preferences }) {
  const {
    display_name = "Roommate profile",
    bio = "",
    major,
    class_year,
    interests = [],
    photos = [],
  } = profile;

  const sortedPhotos = [...photos]
    .filter((photo) => photo?.url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const [photoIndex, setPhotoIndex] = useState(0);
  const activePhoto = sortedPhotos[photoIndex];
  const answers = preferences?.scenario_answers ?? preferences?.scenarioAnswers;

  const lifestyle = answers
    ? LIFESTYLE.filter(({ key }) =>
        Number.isInteger(answers[key]) && answers[key] >= 0 && answers[key] <= 3
      )
    : [];

  function changePhoto(direction) {
    setPhotoIndex((current) =>
      (current + direction + sortedPhotos.length) % sortedPhotos.length
    );
  }

  return (
    <article className="rc-card" aria-label={`Roommate card for ${display_name}`}>
      <section className="rc-gallery" aria-label="Profile photos">
        {activePhoto ? (
          <img
            className="rc-gallery-image"
            src={activePhoto.url}
            alt={`${display_name}'s profile photo ${photoIndex + 1}`}
          />
        ) : (
          <div className="rc-photo-placeholder" aria-label="No profile photo uploaded">
            <span>{initials(display_name) || "?"}</span>
            <small>Photo coming soon</small>
          </div>
        )}

        <div className="rc-gallery-shade" />

        {sortedPhotos.length > 1 && (
          <>
            <div className="rc-photo-progress" aria-label={`Photo ${photoIndex + 1} of ${sortedPhotos.length}`}>
              {sortedPhotos.map((photo, index) => (
                <span
                  key={photo.id ?? `${photo.position}-${index}`}
                  className={index === photoIndex ? "is-active" : ""}
                />
              ))}
            </div>
            <button
              type="button"
              className="rc-photo-arrow rc-photo-prev"
              onClick={() => changePhoto(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="rc-photo-arrow rc-photo-next"
              onClick={() => changePhoto(1)}
              aria-label="Next photo"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        <div className="rc-identity">
          <div className="rc-name-line">
            <h3>{display_name}</h3>
            <span className="rc-profile-badge"><Sparkles size={13} /> Roommate profile</span>
          </div>
          {class_year && (
            <span className="rc-year">
              <GraduationCap size={16} />
              Class of {class_year}
            </span>
          )}
        </div>
      </section>

      <div className="rc-content">
        <section className="rc-details" aria-label="Profile details">
          <div className="rc-section-heading">
            <span className="rc-section-icon"><BookOpen size={16} /></span>
            <h4>About</h4>
          </div>

          {major && (
            <div className="rc-major">
              <span className="rc-detail-label">Major</span>
              <strong>{major}</strong>
            </div>
          )}

          <p className={`rc-bio ${bio ? "" : "rc-empty-text"}`}>
            {bio || "This student hasn't added a bio yet."}
          </p>
        </section>

        <section className="rc-interests-section" aria-label="Interests">
          <div className="rc-section-heading">
            <span className="rc-section-icon"><Heart size={16} /></span>
            <h4>Interests</h4>
            <span className="rc-section-count">{interests.length}/10</span>
          </div>
          {interests.length > 0 ? (
            <ul className="rc-tags">
              {interests.map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          ) : (
            <p className="rc-empty-text">No interests added yet.</p>
          )}
        </section>

        {lifestyle.length > 0 && (
          <section className="rc-lifestyle-section" aria-label="Lifestyle preferences">
            <div className="rc-section-heading">
              <span className="rc-section-icon"><Sparkles size={16} /></span>
              <h4>Living habits</h4>
            </div>
            <div className="rc-lifestyle-grid">
              {lifestyle.map(({ key, Icon, title, labels }) => (
                <div className="rc-lifestyle-item" key={key}>
                  <span className="rc-lifestyle-icon"><Icon size={16} /></span>
                  <span>
                    <small>{title}</small>
                    <strong>{labels[answers[key]]}</strong>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
