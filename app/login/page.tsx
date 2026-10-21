"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/strings";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const handleSignUp = async () => {
    setMessage("");
    if (username.includes("@")) {
      setMessage(t.usernameHasAt);
      return;
    }
    if (username.trim().length < 2) {
      setMessage(t.usernameShort);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } },
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data.session && data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: data.user.id, username: username.trim() });
      if (profileError) {
        setMessage(
          profileError.code === "23505"
            ? t.usernameTaken
            : profileError.message
        );
        return;
      }
      router.push("/");
    } else {
      setMessage(t.confirmEmailSent);
    }
  };

  const handleSignIn = async () => {
    setMessage("");
    if (username.includes("@")) {
      setMessage(t.usernameHasAt);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      const name =
        username.trim() ||
        (data.user.user_metadata?.username as string | undefined);
      if (!name) {
        setMessage(t.usernameFirstLogin);
        await supabase.auth.signOut();
        return;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: data.user.id, username: name });
      if (profileError) {
        setMessage(
          profileError.code === "23505"
            ? t.usernameTaken
            : profileError.message
        );
        await supabase.auth.signOut();
        return;
      }
    }
    router.push("/");
  };

  return (
    <main className="mx-auto max-w-xl p-8">
      <Link href="/" className="text-sm underline">
        {t.backToList}
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-6">{t.loginTitle}</h1>

      <input
        type="email"
        className="w-full rounded border p-2 mb-3 bg-black text-white"
        placeholder={t.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        className="w-full rounded border p-2 mb-3 bg-black text-white"
        placeholder={t.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="text"
        autoComplete="off"
        className="w-full rounded border p-2 mb-3 bg-black text-white"
        placeholder={t.usernameField}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <div className="flex gap-3">
        <button
          className="rounded bg-white px-4 py-2 text-black"
          onClick={handleSignIn}
        >
          {t.login}
        </button>
        <button className="rounded border px-4 py-2" onClick={handleSignUp}>
          {t.signUp}
        </button>
      </div>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </main>
  );
}