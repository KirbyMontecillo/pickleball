import { useState } from 'react';

export const toUsername = (email: string) => email.replace(/^pq\./, '').replace(/@gmail\.com$/, '');

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Pickleball">
      <circle cx="24" cy="24" r="22" fill="#ec4899" />
      <g fill="#fff" opacity=".9">
        <circle cx="24" cy="24" r="2.6" />
        <circle cx="35" cy="24" r="2.6" />
        <circle cx="29.5" cy="33.5" r="2.6" />
        <circle cx="18.5" cy="33.5" r="2.6" />
        <circle cx="13" cy="24" r="2.6" />
        <circle cx="18.5" cy="14.5" r="2.6" />
        <circle cx="29.5" cy="14.5" r="2.6" />
      </g>
    </svg>
  );
}

export default function Header({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const name = toUsername(email);

  return (
    <header className="relative flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Logo />
        <span className="text-xl font-bold text-gray-900">Pickleball</span>
      </div>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Profile"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-100 text-lg font-bold text-pink-600"
      >
        {name.charAt(0).toUpperCase() || '?'}
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-10 w-52 rounded-2xl border border-pink-100 bg-white p-2 shadow-lg">
          <p className="px-3 py-2 text-sm text-gray-400">
            Signed in as <span className="font-semibold text-gray-900">{name}</span>
          </p>
          <button
            className="min-h-11 w-full rounded-xl px-3 text-left font-medium text-pink-500 hover:bg-pink-50"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
}