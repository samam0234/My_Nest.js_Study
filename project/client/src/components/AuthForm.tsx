import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiRequestError } from '../api.js';

interface AuthFormProps {
  onLogin: (accessToken: string) => void;
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register(email, password);
      }
      const { accessToken } = await api.login(email, password);
      onLogin(accessToken);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{mode === 'login' ? '로그인' : '회원가입'}</h2>
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="비밀번호 (8자 이상)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입 후 로그인'}
      </button>
      <button
        type="button"
        className="link-button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </form>
  );
}
