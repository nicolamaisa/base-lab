import { useState } from "react";
import {
  Check,
  CircleUserRound,
  Gauge,
  Info,
  LogOut,
  MonitorCog,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../auth/useAuth";

import { PageHeader } from "../components/layout/PageHeader";
import { RemoteModelsSettings } from "../components/settings/RemoteModelsSettings";
import { LocalModelsSettings } from "../components/settings/LocalModelsSettings";

import { usePreferences } from "../providers/usePreferences";
import { constants } from "../config/constants";

export function SettingsPage() {
  const { session, signOut } = useAuth();

  const { density, motion, setDensity, setMotion, resetPreferences } =
    usePreferences();

  const [signingOut, setSigningOut] = useState(false);

  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    setSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Sign out failed"
      );

      setSigningOut(false);
    }
  }

  return (
    <main className="dashboardPage settingsPage">
      <PageHeader
        title="Settings"
        description={`Manage models, local interface preferences, and your current authenticated session.`}
      />

      <div className="settingsLayout">
        <section className="settingsSection">
          <header>
            <span className="settingsSectionIcon">
              <CircleUserRound size={20} aria-hidden />
            </span>

            <div>
              <h2>Account</h2>

              <p>Information from the authenticated Supabase session.</p>
            </div>
          </header>

          <dl className="settingsInfoList">
            <div>
              <dt>Email</dt>

              <dd>{session?.user.email ?? "Not available"}</dd>
            </div>

            <div>
              <dt>User ID</dt>

              <dd>{session?.user.id ?? "Not available"}</dd>
            </div>

            <div>
              <dt>Account created</dt>

              <dd>
                {session?.user.created_at
                  ? new Date(session.user.created_at).toLocaleString()
                  : "Not available"}
              </dd>
            </div>
          </dl>
        </section>

        <LocalModelsSettings />

        <RemoteModelsSettings />

        <section className="settingsSection">
          <header>
            <span className="settingsSectionIcon">
              <MonitorCog size={20} aria-hidden />
            </span>

            <div>
              <h2>Interface</h2>

              <p>These preferences are stored only in this browser.</p>
            </div>
          </header>

          <fieldset className="settingsChoiceGroup">
            <legend>Interface density</legend>

            <p>Choose how much information is visible at once.</p>

            <label>
              <input
                type="radio"
                name="density"
                value="comfortable"
                checked={density === "comfortable"}
                onChange={() => {
                  setDensity("comfortable");
                }}
              />

              <span>
                <Gauge size={18} aria-hidden />

                <span>
                  <strong>Comfortable</strong>

                  <small>More spacing and larger content areas.</small>
                </span>

                {density === "comfortable" ? (
                  <Check size={18} aria-hidden />
                ) : null}
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="density"
                value="compact"
                checked={density === "compact"}
                onChange={() => {
                  setDensity("compact");
                }}
              />

              <span>
                <Gauge size={18} aria-hidden />

                <span>
                  <strong>Compact</strong>

                  <small>Denser cards and tables for larger workspaces.</small>
                </span>

                {density === "compact" ? <Check size={18} aria-hidden /> : null}
              </span>
            </label>
          </fieldset>

          <fieldset className="settingsChoiceGroup">
            <legend>Motion</legend>

            <p>Control decorative animation and transition effects.</p>

            <label>
              <input
                type="radio"
                name="motion"
                value="system"
                checked={motion === "system"}
                onChange={() => {
                  setMotion("system");
                }}
              />

              <span>
                <Sparkles size={18} aria-hidden />

                <span>
                  <strong>Follow system</strong>

                  <small>Respect the operating system motion setting.</small>
                </span>

                {motion === "system" ? <Check size={18} aria-hidden /> : null}
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="motion"
                value="reduced"
                checked={motion === "reduced"}
                onChange={() => {
                  setMotion("reduced");
                }}
              />

              <span>
                <Sparkles size={18} aria-hidden />

                <span>
                  <strong>Reduce motion</strong>

                  <small>Disable most animations and smooth movement.</small>
                </span>

                {motion === "reduced" ? <Check size={18} aria-hidden /> : null}
              </span>
            </label>
          </fieldset>

          <button
            className="settingsResetButton"
            type="button"
            onClick={resetPreferences}
          >
            <RotateCcw size={16} aria-hidden />
            Reset interface preferences
          </button>
        </section>

        <section className="settingsSection">
          <header>
            <span className="settingsSectionIcon">
              <Info size={20} aria-hidden />
            </span>

            <div>
              <h2>About</h2>

              <p>Current application information.</p>
            </div>
          </header>

          <dl className="settingsInfoList">
            <div>
              <dt>Product</dt>

              <dd>{constants.appName}</dd>
            </div>

            <div>
              <dt>Web version</dt>

              <dd>{constants.appVersion}</dd>
            </div>
            <div>
              <dt>Architecture</dt>
              <dd>API · Worker · LLM gateway</dd>
            </div>

            <div>
              <dt>Model sources</dt>
              <dd>Local discovery · Remote catalog</dd>
            </div>
          </dl>
        </section>

        <section className="settingsSection settingsDangerSection">
          <header>
            <span className="settingsSectionIcon">
              <LogOut size={20} aria-hidden />
            </span>

            <div>
              <h2>Session</h2>

              <p>End the current authenticated session on this browser.</p>
            </div>
          </header>

          {signOutError ? (
            <div className="formError" role="alert">
              {signOutError}
            </div>
          ) : null}

          <button
            className="settingsSignOutButton"
            type="button"
            disabled={signingOut}
            onClick={() => {
              void handleSignOut();
            }}
          >
            <LogOut size={17} aria-hidden />

            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </section>
      </div>
    </main>
  );
}
