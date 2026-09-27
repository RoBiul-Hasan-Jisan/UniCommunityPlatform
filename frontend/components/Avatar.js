// Shows a real photo when the person has one, initials otherwise — the
// same .avatar class handles both, so this is a drop-in replacement for
// every "circle with initials" spot in the app.
export function avatarInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function Avatar({ name, avatarUrl, className = "w-9 h-9 text-xs" }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || "Profile"} className={`avatar object-cover ${className}`} />;
  }
  return <span className={`avatar ${className}`}>{avatarInitials(name)}</span>;
}
