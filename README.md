# The Register — Investment Consultant Oversight

A shared, multi-user web app for tracking investment consultant objectives,
annual reviews and 3-year objective revisions under Part 7 of the Scheme
Administration Regulations (formerly the CMA Order). Anyone you add to a
scheme — client-side trustees and adviser-side staff alike — can sign in
with their own email and edit it. No shared logins, no spreadsheets emailed
back and forth.

Built with Next.js (App Router) + Supabase (Postgres database + email
sign-in), deployed on Vercel. All three have workable free tiers, so you
can get this live without spending anything to start.

---

## 1. Create your Supabase project (the database + login system)

1. Go to https://supabase.com, sign up, and click **New project**.
2. Give it a name (e.g. "ic-register"), set a database password (save it
   somewhere), pick a region close to your users, and create it. This
   takes a minute or two.
3. Once it's ready, open **SQL Editor** in the left sidebar, click
   **New query**, paste in the entire contents of `supabase/schema.sql`
   from this project, and click **Run**. This creates all the tables and
   the security rules that keep each scheme visible only to the people
   added to it. Then do the same with `supabase/002_documents.sql`, which
   adds the private file storage for annual reports.
4. Open **Authentication -> Providers** and confirm **Email** is enabled
   (it is by default). Turn off "Confirm email" only if you want sign-up
   to be instant — for magic-link sign-in you can leave the default
   settings.
5. Open **Authentication -> URL Configuration**. You'll come back here
   once you know your live web address (step 3 below) to add it as a
   **Redirect URL** — for now, note this page exists.
6. Open **Project Settings -> API**. You'll need two values from here in
   a moment: the **Project URL** and the **anon public** key.

A note on email: Supabase's built-in email sender works out of the box
for trying this out, but it's rate-limited and not meant for real traffic.
Before relying on this for real trustee/adviser use, set up a proper email
provider under **Project Settings -> Auth -> SMTP Settings** (Supabase's
docs list a few free-tier-friendly options) so sign-in links land
reliably.

## 2. Put the code on GitHub

1. Create a new, empty repository on GitHub (private is fine).
2. From inside this project folder, run:

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## 3. Deploy on Vercel

1. Go to https://vercel.com, sign up (you can sign in with your GitHub
   account), and click **Add New -> Project**.
2. Import the repository you just pushed.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` — the Project URL from Supabase step 1.6
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon public key from the same
     place
4. Click **Deploy**. After a minute or two you'll get a live address like
   `https://ic-register-yourname.vercel.app`.
5. Copy that address, go back to Supabase -> **Authentication -> URL
   Configuration**, and add `https://ic-register-yourname.vercel.app/**`
   as a **Redirect URL** (and set it as the **Site URL** too). Without
   this step, sign-in links will fail to redirect back into the app.

That's it — the app is live. Anyone you invite from inside the app (via
the "Who has access" section on a scheme) can go to that address, enter
their email, and get a sign-in link.

### Custom domain (optional)

In Vercel, open the project -> **Settings -> Domains** and add your own
domain (e.g. `register.yourfirm.co.uk`), following Vercel's DNS
instructions. Then add that address to the Supabase redirect URL list the
same way as step 3.5 above.

## 4. Running it locally (optional, for development)

```
npm install
cp .env.local.example .env.local # then fill in your Supabase values
npm run dev
```

Open http://localhost:3000.

---

## How access works

- Every scheme has a list of members (`scheme_members` table), each tied
  to an email address.
- The person who creates a scheme becomes its **owner** automatically.
- Any member can add another member by email from the "Who has access"
  section on a scheme's page — whether or not that person has signed up
  yet. If they haven't, the invite sits pending and links itself to their
  account automatically the first time they sign in with that email.
- Only an owner can delete a scheme or remove other members; any member
  can remove themselves.
- The database's row-level security rules (in `supabase/schema.sql`)
  enforce this on the server side — it isn't just hidden in the UI.

## Project structure

```
app/
  login/                sign-in page (magic link)
  auth/callback/        completes sign-in, sets the session cookie
  auth/signout/         signs out
  schemes/               overview of every scheme you're a member of
  schemes/new/           add a scheme
  schemes/[id]/          a single scheme: details, objectives, annual
                         reports, reviews, revisions, compliance
                         statement, member access
  schemes/[id]/documents/[docId]/
                         downloads an annual report file
components/
  Rail.tsx              the left-hand scheme list, shared across pages
  CopyButton.tsx         "copy to clipboard" for the compliance statement
  DocumentUpload.tsx     uploads an annual report straight to storage
lib/
  supabase/              Supabase client setup (browser + server)
  dates.ts               shared status/date logic used everywhere
  documents.ts           annual report types (TCFD, SIP, Trustee Report)
supabase/
  schema.sql             run this once in Supabase's SQL Editor
  002_documents.sql      run this once too: annual report storage
```
