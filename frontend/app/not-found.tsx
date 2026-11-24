import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="card p-8 max-w-md text-center">
        <div className="font-serif text-5xl text-brass-500 mb-2">404</div>
        <h1 className="font-serif text-xl text-ink-800 mb-2">Page not found</h1>
        <p className="text-sm text-gray-500 mb-5">The page you're looking for doesn't exist or has moved.</p>
        <Link className="btn-primary" href="/feed">Back to the feed</Link>
      </div>
    </div>
  );
}
