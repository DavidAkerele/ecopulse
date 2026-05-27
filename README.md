# EcoPulse Analytics Platform

## 🌍 Overview
EcoPulse is a **real‑time AI sustainability platform** that estimates the environmental impact of AI activity. It captures anonymised telemetry such as token usage, model selection, and workload type, combines it with live UK National Grid carbon‑intensity data, and provides actionable sustainability recommendations.

> **GDPR‑conscious** – only anonymised metadata is stored; no raw prompts, uploaded files, images, audio, or personal identifiers are persisted.

---

## 🚀 Features
- **Telemetry**: Session activity, AI audit events, UI click events, grid carbon intensity observations, sustainability recommendations, and model metadata.
- **Privacy‑first**: All user‑identifiable data is hashed (SHA‑256) and never stored.
- **Realtime grid data**: Pulls live UK National Grid carbon‑intensity values.
- **Modern UI**: Glass‑morphic preloader, smooth transitions, and a green‑by‑default background when the grid connection succeeds.
- **Supabase backend**: PostgreSQL schema with check constraints, GDPR‑ready tables, and full TypeScript typings.

---

## 📁 Repository Layout
```
/ecopulse
├─ public/                # static assets (favicon, icons)
├─ src/                   # frontend source (React + Vite)
│   ├─ routes/            # page routes – contains the new glass‑morphic preloader
│   ├─ lib/                # reusable UI utilities (ecoBody.ts, etc.)
│   └─ app.js              # telemetry helpers and Supabase client init
├─ supabase/              # Supabase project files
│   ├─ migrations/        # SQL migration defining the analytics schema
│   └─ functions/         # optional edge functions (future)
├─ .env                    # Supabase connection keys (VITE_SUPABASE_URL & ANON_KEY)
├─ vite.config.ts          # Vite dev server config
└─ README.md               # **this file**
```

---

## 🔧 Prerequisites
- **Node ≥18** (or Bun) – the project uses Vite and React.
- **Supabase account** – create a project and obtain the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values.
- **Git** – for version control and pushing to GitHub.

---

## ⚙️ Setup & Development
1. **Clone the repo**
```bash
git clone https://github.com/your‑org/ecopulse.git
cd ecopulse
```
2. **Install dependencies**
```bash
bun install   # or npm install / yarn install
```
3. **Configure environment**
Create a `.env` file at the project root (lower‑case name) with:
```dotenv
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```
> *Never commit this file.* Add it to `.gitignore` (already present).
4. **Run Supabase migrations**
```bash
npx supabase start   # starts a local Supabase container (optional)
npx supabase db reset   # drops & recreates the DB locally
npx supabase db push     # pushes migrations from supabase/migrations
```
   The migration `20260527000000_init_analytics_schema.sql` creates the GDPR‑conscious tables:
   - `session_activity`
   - `ai_audit_events`
   - `click_events`
   - `grid_carbon_intensity`
   - `sustainability_recommendations`
   - `model_catalog`
   - `workload_assumptions`
   See **Database Design** section below for details.
5. **Start the dev server**
```bash
bun run dev   # or npm run dev
```
   The app will be available at `http://localhost:5173`. You’ll see the new glass‑morphic preloader while the app boots.

---

## 📊 Database Design
The analytics schema lives in `supabase/migrations/20260527000000_init_analytics_schema.sql`. Highlights:
- **Check constraints** enforce GDPR‑safe values (e.g., `model_size` allows `'Auto'`).
- **Timestamps** (`created_at`, `updated_at`) are automatically set with `NOW()`.
- **JSONB columns** store flexible key/value telemetry without exposing raw content.
- **Indexes** on `session_hash`, `model_id`, and `grid_timestamp` optimise common queries.

For a visual ER diagram, see the `docs/erd.png` file (generated from the migration).

---

## 🛠️ Adding New Models or Workloads
1. **Update `model_catalog`**
```sql
INSERT INTO model_catalog (model_id, name, provider, size, cost_per_token, carbon_per_token, max_tokens, tags)
VALUES ('gpt-oss-120b-medium', 'GPT‑OSS 120B (Medium)', 'OpenAI', 'Auto', 0.0015, 1.5, 0.015, '{nlp,large,medium}');
```
2. **Refresh the front‑end enum** – Edit `src/lib/modelOptions.ts` to include the new identifier.
3. **Run migration** (if you change schema) and push with `supabase db push`.

---

## 📦 Deployment
The project is ready for **Firebase App Hosting** or **Vercel**. Example Firebase steps:
```bash
npm i -g firebase-tools
firebase login
firebase init hosting   # select "Use existing project" and point to the `dist` folder
npm run build           # generates `dist/`
firebase deploy          # uploads the static build
```
For Supabase, the cloud instance already hosts the database; just ensure the environment variables on the hosting platform match the local `.env` values.

---

## 📚 Further Reading
- **GDPR & Analytics** – https://gdpr.eu/analytics/
- **Carbon‑intensity API (UK Grid)** – https://api.carbonintensity.org.uk/
- **Supabase Docs** – https://supabase.com/docs
- **EcoPulse Architecture** – see `docs/architecture.md` for a deeper dive.

---

## 🤝 Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your‑feature`).
3. Write tests (if applicable) and ensure `bun run lint` passes.
4. Open a Pull Request – describe the change and reference any related issue.

---

## 📄 License
This project is licensed under the **MIT License**. See `LICENSE` for details.

---

*Happy coding, and keep AI green!*
