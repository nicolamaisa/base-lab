import { SubmitEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { constants } from "../config/constants";

type LoginLocationState = {
  from?: string;
};

export function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/" replace />;
  }

  const locationState = location.state as LoginLocationState | null;

  const destination = locationState?.from ?? "/";

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      await signIn(email.trim(), password);

      navigate(destination, {
        replace: true,
      });
    } catch (signInError) {
      setError(
        signInError instanceof Error ? signInError.message : "Login failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="loginPage">
      <section className="loginCard">
        <div className="loginHeader">
          <span className="eyebrow">{constants.appName}</span>

          <h1>Welcome back</h1>

          <p>Sign in to access.</p>
        </div>

        <form className="loginForm" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>

            <input
              type="email"
              value={email}
              autoComplete="email"
              required
              disabled={submitting}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </label>

          <label>
            <span>Password</span>

            <input
              type="password"
              value={password}
              autoComplete="current-password"
              required
              disabled={submitting}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </label>

          {error ? <div className="formError">{error}</div> : null}

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
