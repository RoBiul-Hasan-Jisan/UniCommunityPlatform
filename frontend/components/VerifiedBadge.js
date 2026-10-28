// Small check mark shown next to people whose university email was verified
// (or who an admin verified manually).
export default function VerifiedBadge({ show = true, className = "" }) {
  if (!show) return null;
  return (
    <span title="Verified member" aria-label="Verified member" className={`inline-flex items-center align-middle text-brass-500 ${className}`}>
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 1.5l2.2 1.6 2.7-.1.9 2.6 2.2 1.6-.8 2.6.8 2.6-2.2 1.6-.9 2.6-2.7-.1L10 18.5l-2.2-1.6-2.7.1-.9-2.6L2 12.8l.8-2.6L2 7.6l2.2-1.6.9-2.6 2.7.1L10 1.5zm3.7 6.2a.75.75 0 00-1.1-1L9 10.3 7.4 8.7a.75.75 0 10-1.1 1l2.1 2.1c.3.3.8.3 1.1 0l4.2-4.1z" clipRule="evenodd" />
      </svg>
    </span>
  );
}
