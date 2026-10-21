"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/strings";

type Community = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

export default function Home() {
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .order("id");
      if (error) {
        console.error(error);
        return;
      }
      setCommunities(data ?? []);
    };
    load();
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold mb-6">{t.communities}</h1>
      <ul className="space-y-3">
        {communities.map((c) => (
          <li key={c.id}>
            <Link
              href={`/c/${c.slug}`}
              className="block rounded border p-4 hover:bg-white/10"
            >
              <div className="text-xl font-bold">{c.name}</div>
              <div className="text-sm opacity-70">{c.description}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}