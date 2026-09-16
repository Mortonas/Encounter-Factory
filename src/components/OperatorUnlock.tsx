import { useState, type FormEvent } from "react";

interface OperatorUnlockProps {
  onUnlock: (token: string) => void;
  onPublicBriefing: () => void;
}

export function OperatorUnlock({ onUnlock, onPublicBriefing }: OperatorUnlockProps) {
  const [token, setToken] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (token.length >= 32) onUnlock(token);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Local Preview</p>
          <h1 className="mt-2 text-3xl font-black">Encounter Factory</h1>
          <p className="mt-3 text-sm text-zinc-400">Enter the local operator token. It is kept only for this browser session.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" htmlFor="operator-token">Operator token</label>
          <input id="operator-token" type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3" />
          <button type="submit" disabled={token.length < 32} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-bold disabled:opacity-40">Unlock operator console</button>
        </form>
        <button onClick={onPublicBriefing} className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300">Submit a public briefing</button>
      </div>
    </div>
  );
}
