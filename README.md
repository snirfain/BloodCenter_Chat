# 🩸 מד״א — בדיקת זכאות לתרומת דם
### MDA Blood Donation Eligibility Chatbot

A medical-grade, Hebrew-language chatbot web application for verifying blood donation eligibility, built to MDA (Magen David Adom) protocols.

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 19 + Vite + TypeScript      |
| Styling     | Tailwind CSS v3                   |
| Icons       | Lucide React                      |
| Database    | Supabase (PostgreSQL + RLS)       |
| Deployment  | Vercel / Netlify (pre-configured) |

---

## Features

- **Full RTL Hebrew interface** with MDA brand colors (`#E3000F`)
- **Mobile-first** chat UI resembling WhatsApp/Telegram
- **Quick Reply Buttons** for all closed questions (no typing errors)
- **Smart medication lookup** with fuzzy search across Hebrew + English names
- **Multi-indication drug handling** — if a drug has multiple uses (e.g. Aspirin for pain vs. heart), the bot dynamically asks which indication applies
- **Country risk database** — 80+ countries categorized by malaria/high-risk zones
- **5 final result templates** with clear, human-friendly Hebrew text
- **Star rating system** saved to Supabase
- **WCAG-compliant** accessibility (ARIA labels, keyboard navigation, high contrast, large tap targets)
- **Graceful Supabase degradation** — works fully in demo mode without real credentials

---

## Project Structure

```
src/
├── components/
│   ├── Header.tsx          # Sticky MDA branded header
│   ├── ChatWindow.tsx      # Main orchestrator — renders messages + inputs
│   ├── MessageBubble.tsx   # Bot/user message bubbles + typing indicator
│   ├── QuickReply.tsx      # Quick reply button grid
│   ├── TextInput.tsx       # Free-text input with validation
│   ├── MedicationSearch.tsx # Fuzzy medication autocomplete
│   └── StarRating.tsx      # 1–5 star rating widget
├── data/
│   ├── medications.ts      # MDA medication rules (from medication_eligibility.tsv)
│   └── countries.ts        # 80+ countries with malaria/risk classification
├── hooks/
│   └── useChatFlow.ts      # Full state machine — all flow logic lives here
├── services/
│   ├── supabase.ts         # Supabase client + DB types
│   └── db.ts               # createUser / createSession / updateSession / saveRating
└── types/
    └── chat.ts             # ChatMessage, FlowStep, SessionAnswers, FinalStatus types
```

---

## Setup

### 1. Clone & Install

```bash
git clone <repo>
cd BloodCenter_Chat
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase_schema.sql` in your Supabase SQL editor
3. Copy your Project URL and `anon` key

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> **Without real credentials:** the app works fully in demo mode — all flow logic runs, Supabase errors are silently swallowed.

### 4. Run Locally

```bash
npm run dev
```

---

## Chatbot Flow

```
Step 0: Phone number (validated 05X-XXXXXXX)
  └── Step 1a: Last donation date
  └── Step 1b: Age bracket
  └── Step 1c: Weight >50kg
  └── Step 1d: Pregnancy / birth in last 6 months
Step 2a: Procedures (tattoo / colonoscopy / none)
  └── If colonoscopy: biopsy? → result?
Step 2b: Medications (fuzzy search → multi-indication handling)
Step 2c: Chronic disease / medical condition
Step 2d: Recent illness / dental treatment
Step 3: International travel → country risk lookup
Step 4: Additional open question
  └── FINAL RESULT (one of 5 outcomes)
  └── Star rating (3s delay)
  └── Restart button
```

---

## Final Result Types

| Status            | Trigger Example                                    |
|-------------------|----------------------------------------------------|
| ✅ זכאות מלאה      | All clear                                          |
| ✅ זכאות עם אישור  | Age 17–18, or 60–65                               |
| ❌ פסילה קבועה     | Under 17, under 50kg, blood thinners, epilepsy    |
| ⏳ פסילה זמנית     | Tattoo (4m), recent antibiotic (7d), malaria zone |
| 🔍 בירור רפואי    | Unknown drug, undisclosed disease, abnormal biopsy|

---

## Deployment

### Vercel
```bash
npx vercel --prod
# Set env vars in Vercel dashboard
```

### Netlify
```bash
npm run build
# Drag dist/ to Netlify, or connect GitHub repo
# Set env vars in Netlify dashboard
```

Both `vercel.json` and `netlify.toml` are pre-configured.

---

## Privacy & Security

- Phone numbers and medical answers are stored in **separate tables** linked only by a UUID
- Row Level Security (RLS) is enabled — anonymous users can only **insert**, never read others' data
- No PII is ever logged to the browser console in production

---

## Extending the Medications Database

Open `src/data/medications.ts` and add entries following this pattern:

```typescript
{
  name: "שם התרופה",
  aliases: ["trade name", "generic name"],
  indications: [
    { reason: "שימוש ראשון", action: "זכאות מלאה", waitTime: "24 שעות" },
    { reason: "שימוש שני", action: "פסילה קבועה", details: "הסבר" },
  ],
}
```

Valid `action` values: `"זכאות מלאה"` | `"פסילה קבועה"` | `"פסילה זמנית"` | `"בירור רפואי"`
