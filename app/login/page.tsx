"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="auth-shell">
      <p className="block-note" style={{ marginBottom: 8 }}>
        Scheme Administration Regulations · Part 7
      </p>
      <h2>The Register</h2>
      <p>
        Sign in to view and edit the schemes you&apos;ve been added to. No password —
        we&apos;ll email you a one-time link.
      </p>

      {status === "sent" ? (
        <div className="empty-state" style={{ textAlign: "left" }}>
          Check <b>{email}</b> for a sign-in link. You can close this tab once you&apos;ve
          clicked it.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfirm.co.uk"
            />
          </div>
          {status === "error" && (
            <p style={{ color: "var(--brick)", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
          )}
          <button className="btn primary" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending link…" : "Send sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}
