"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { googleLogin, logIn, resetPassword, signUp } from "@/lib/services/auth";
import { friendlyError } from "@/lib/utils";
import { ErrorBox } from "@/components/ui";

function LoginForm() {
  const sp = useSearchParams(); const router = useRouter(); const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "reset">(sp.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [info, setInfo] = useState("");
  useEffect(() => { if (!loading && user) router.replace("/dashboard"); }, [loading, user, router]);

  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(""); setInfo(""); try { await fn(); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); } };
  const submit = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    if (mode === "signup") await signUp(name.trim() || email.split("@")[0], email, password);
    else if (mode === "login") await logIn(email, password);
    else { await resetPassword(email); setInfo("Password reset link sent. Check your inbox (and spam)."); }
  }); };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold"><BarChart3 className="h-7 w-7 text-brand-500" />ExamVerse</div>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <h1 className="text-lg font-bold">{mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}</h1>
        {err && <ErrorBox message={err} />}{info && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{info}</p>}
        {mode === "signup" && <div><label className="label">Full name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></div>}
        <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        {mode !== "reset" && <div><label className="label">Password</label><input className="input" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "signup" ? "Sign up" : "Send reset link"}</button>
        {mode !== "reset" && <button type="button" className="btn-outline w-full" disabled={busy} onClick={() => run(googleLogin)}>Continue with Google</button>}
        <div className="flex justify-between text-sm text-brand-600">
          {mode === "login" ? <><button type="button" onClick={() => setMode("signup")}>Create account</button><button type="button" onClick={() => setMode("reset")}>Forgot password?</button></>
            : <button type="button" onClick={() => setMode("login")}>Back to login</button>}
        </div>
      </form>
    </div>
  );
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
