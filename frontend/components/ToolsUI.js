// Shared UI primitives for /tools. These are thin wrappers around the SAME
// classes the rest of the app already uses (card, input, btn-primary,
// avatar, section-label) so Tools looks and feels native to the product
// instead of a separately-styled experiment bolted on top of it.

export function ElevatedCard({ className = "", interactive = false, children }) {
  return <div className={`card ${interactive ? "card-interactive" : ""} ${className}`}>{children}</div>;
}

export function ToolInput({ className = "", ...props }) {
  return <input className={`input ${className}`} {...props} />;
}

export function ToolSelect({ children, className = "", ...props }) {
  return (
    <select className={`input ${className}`} {...props}>
      {children}
    </select>
  );
}

export function ToolTextarea({ className = "", ...props }) {
  return <textarea className={`input ${className}`} {...props} />;
}

export function SectionTitle({ children }) {
  return <div className="section-label mb-3">{children}</div>;
}

export function GradientButton({ className = "", children, ...props }) {
  return (
    <button className={`btn-primary ${className}`} {...props}>
      {children}
    </button>
  );
}

// Matches the .avatar treatment used everywhere else a circular ink/brass
// mark appears (profile initials, the sidebar crest) — same identity,
// reused rather than reinvented.
export function IconBadge({ children, className = "" }) {
  return (
    <span className={`avatar w-11 h-11 ${className}`}>
      {children}
    </span>
  );
}
