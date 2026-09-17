// Shared, more premium UI primitives for the /tools section — real
// elevation (layered shadows) instead of flat hairline borders, consistent
// spacing and input styling across the CGPA, cover page, and resume tools.

export function ElevatedCard({ className = "", children }) {
  return (
    <div
      className={`rounded-2xl bg-white border border-gray-200/70 shadow-[0_1px_1px_rgba(18,25,43,0.03),0_14px_32px_-16px_rgba(18,25,43,0.16)] ${className}`}
    >
      {children}
    </div>
  );
}

export function ToolInput(props) {
  return (
    <input
      className="w-full px-3.5 py-2.5 rounded-[10px] border border-gray-200 bg-gray-50/60 text-[0.9rem] text-ink-800 placeholder:text-gray-400 transition-all duration-150 focus:outline-none focus:bg-white focus:border-brass-400 focus:ring-4 focus:ring-brass-400/10"
      {...props}
    />
  );
}

export function ToolSelect({ children, className = "", ...props }) {
  return (
    <select
      className={`w-full px-3.5 py-2.5 rounded-[10px] border border-gray-200 bg-gray-50/60 text-[0.9rem] text-ink-800 transition-all duration-150 focus:outline-none focus:bg-white focus:border-brass-400 focus:ring-4 focus:ring-brass-400/10 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function ToolTextarea(props) {
  return (
    <textarea
      className="w-full px-3.5 py-2.5 rounded-[10px] border border-gray-200 bg-gray-50/60 text-[0.9rem] text-ink-800 placeholder:text-gray-400 transition-all duration-150 focus:outline-none focus:bg-white focus:border-brass-400 focus:ring-4 focus:ring-brass-400/10"
      {...props}
    />
  );
}

export function SectionTitle({ children }) {
  return <div className="text-[0.8rem] font-semibold tracking-wide text-ink-700 mb-3">{children}</div>;
}

export function GradientButton({ className = "", children, ...props }) {
  return (
    <button
      className={`py-2.5 px-5 rounded-[10px] text-[0.9rem] font-semibold text-white bg-gradient-to-b from-[#C0973A] to-[#9C7526] shadow-[0_1px_2px_rgba(18,25,43,0.1),0_6px_16px_-4px_rgba(171,129,46,0.45)] transition-all duration-150 hover:shadow-[0_1px_2px_rgba(18,25,43,0.1),0_10px_22px_-4px_rgba(171,129,46,0.55)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconBadge({ children, className = "" }) {
  return (
    <span className={`w-11 h-11 rounded-full bg-gradient-to-b from-ink-700 to-ink-800 text-brass-200 flex items-center justify-center shadow-[0_4px_14px_rgba(18,25,43,0.25)] ${className}`}>
      {children}
    </span>
  );
}
