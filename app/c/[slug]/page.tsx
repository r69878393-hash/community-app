import { Suspense } from "react";
import CommunityView from "./CommunityView";
import { t } from "@/lib/strings";

export default function Page() {
  return (
    <Suspense
      fallback={<main className="mx-auto max-w-xl p-8">{t.loading}</main>}
    >
      <CommunityView />
    </Suspense>
  );
}