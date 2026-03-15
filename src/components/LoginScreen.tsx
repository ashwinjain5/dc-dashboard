import { useState } from 'preact/hooks';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void;
  error: string | null;
  loading: boolean;
}

export function LoginScreen({ onLogin, error, loading }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    onLogin(email.trim(), password);
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        class="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 class="mb-1 text-lg font-bold text-slate-800">DC Dashboard</h1>
        <p class="mb-5 text-xs text-slate-500">Enter your credentials to view dashboard data</p>

        <label class="mb-1 block text-xs font-medium text-slate-600">Email</label>
        <input
          type="email"
          required
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          class="mb-3 block w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="email@example.com"
          autocomplete="email"
        />

        <label class="mb-1 block text-xs font-medium text-slate-600">Password</label>
        <input
          type="password"
          required
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          class="mb-4 block w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Enter password"
          autocomplete="current-password"
        />

        {error && (
          <p class="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          class="w-full rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
