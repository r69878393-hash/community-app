import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-xl p-8 space-y-4 text-sm leading-relaxed">
      <Link href="/" className="underline">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold">Terms of Use (draft)</h1>

      <p>
        This is a prototype. These terms are a placeholder and must be
        reviewed by a lawyer before public launch.
      </p>

      <h2 className="text-xl font-bold pt-2">Your content</h2>
      <p>
        You are responsible for what you post. Only post content you created
        or have permission to share. Do not post harassment, hate, spam,
        illegal content, or content that sexualizes minors.
      </p>

      <h2 className="text-xl font-bold pt-2">Copyright complaints</h2>
      <p>
        If you believe your work was posted without permission, email us at
        [r69878393@gmail.com] with: a description of the work, the link to the
        post, your contact details, and a statement that you are the owner or
        authorized to act for the owner. We will review and remove infringing
        content, and may remove the accounts of repeat infringers.
      </p>

      <h2 className="text-xl font-bold pt-2">Reports and removal</h2>
      <p>
        Users can report posts. We may remove content or accounts that break
        these rules.
      </p>
    </main>
  );
}