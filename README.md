# Ibasho

**A home for every fandom.**

Ibasho is a small social app where each fandom gets its own space.

Think of a typical social network as one giant school where everyone is mixed together. Ibasho works differently: you make a *class* around the thing you love, and the people who love it gather there.

*"Ibasho" (居場所) is a Japanese word for a place where you feel you belong.*

> **Status:** early prototype. Things will change, and some parts are rough.

**Live demo:** https://community-app-five-sigma.versel.app

---

## What it does

- **Communities by interest.** Each community (fandom, game, show, artist) has its own page, such as `/c/haruhi`.
- **Three kinds of posts.** Text, images (up to 5 MB), and short videos (MP4 or WebM, up to 20 MB and 60 seconds).
- **Accounts.** Sign up with email and password, with a public username. Email addresses are never shown to other users.
- **Your posts, your control.** Delete your own posts, including their uploaded files.
- **Reporting.** Report a post as spam, abuse, copyright, or other.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Auth, Postgres, Storage)
- Deployed on [Vercel](https://vercel.com/)

## Project structure

```
app/
  page.tsx                    Home page and community list
  layout.tsx                  Site title and description
  login/page.tsx              Log in / sign up
  terms/page.tsx              Terms (template)
  c/[slug]/page.tsx           Community route
  c/[slug]/CommunityView.tsx  Community page (posts, media, delete, report)
lib/
  supabase.ts                 Supabase client
  strings.ts                  All on-screen text in one place
```

## Data model

Tables, all with Row Level Security (RLS) enabled:

| Table | Purpose |
| --- | --- |
| `communities` | id, slug, name, description |
| `posts` | content, type (text / image / video), file paths, author, community |
| `profiles` | public username for each user |
| `reports` | one report per user per post, with a reason |

Storage buckets: `post-images` and `post-videos`. Users can only upload into their own folder.

Access rules in short: anyone can read; only signed-in users can post, delete their own posts, and report.

## Getting started

You need Node.js and a free Supabase project.

```bash
git clone https://github.com/r69878393-hash/community-app.git
cd community-app
npm install
```

Create a file named `.env.local` in the project root (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_KEY=your-anon-public-key
```

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

**Supabase setup:** create the tables and storage buckets listed above, then turn on RLS for each table and add the access rules described in "Data model". Never commit `.env.local`, and never put a `service_role` key in client code.

## Known limitations

- Reported posts are not hidden automatically. Reports are reviewed by hand.
- Videos are served directly from Supabase Storage (small free-tier limit). A video service may be needed later.
- Supabase's built-in email sending is rate-limited; custom SMTP is needed for real traffic.
- The terms page is a template, not legal advice.

## Roadmap

- Let anyone create a community, with limits (sign-in required, a cap per user, naming rules, report handling)
- Custom domain and SEO
- Better moderation tools

## Feedback and contributions

Ideas, bug reports, and questions are very welcome. Please open an issue or start a discussion.

## License

Not decided yet.
