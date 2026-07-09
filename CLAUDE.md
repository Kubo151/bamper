# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bamper — landing page a rezervačný/admin systém pre prenájom nafukovacej pretekárskej trate a detských elektrických vozidiel (bugina, elektroštvorkolka). Klient: Igor. Pôsobenie: Košice, východné a stredné Slovensko.

Projekt pôvodne vznikol pod menom **RaceZone** a bol neskôr premenovaný na **Bamper** (aj GitHub repo bolo premenované `Kubo151/racezone` → `Kubo151/bamper`). Je to jeden nepretržitý projekt/repo, nie dva rôzne.

- **Live:** bamper.sk, www.bamper.sk (auto-deploy z `master` cez Vercel)
- **GitHub:** github.com/Kubo151/bamper
- **Lokálny klon:** `C:\WORK\igor trat` — toto je jediný správny lokálny priečinok pre tento projekt.

## Stack

Vanilla HTML/CSS/JS. Žiadny build tool, žiadny framework, žiadne bundlovanie.

- Každá stránka je self-contained `.html` súbor so všetkým CSS inline v `<style>` tagu
- CSS je duplikované naprieč stránkami — žiadny zdieľaný stylesheet. Pri zmene spoločných komponentov (nav, btn, footer) treba zmenu aplikovať v každom `.html` súbore ručne
- Google Fonts (Sora + Manrope) načítané cez CDN
- Flatpickr 4.6.13 (CDN + SRI integrity hash) pre date picker vo formulári
- `api/*.js` — Vercel serverless funkcie (Node.js)
- `gen-plan.js` je samostatný Node.js skript (nie súčasť webu, gitignored) — generuje `.docx` business plán pomocou balíčka `docx`. `node_modules/`, `package.json`, `package-lock.json` existujú iba pre tento skript
- `resend-key.txt` — lokálny súbor s Resend API kľúčom, gitignored, nikdy necommitovať

## Nasadenie

Push do `master` → Vercel auto-deploy. Žiadny build krok.

**Kritické:** Hlavný súbor musí byť `index.html`. Vercel vracia 404 pri akomkoľvek inom názve. `vercel.json` má rewrite `/admin` → `/admin.html`.

Bežný pracovný postup pre netriviálne zmeny: feature branch → push → Vercel preview deployment → overiť v browseri (claude-in-chrome, iframe trik pre mobilný viewport ak treba) → merge do `master`. Pre malé/nízkorizikové zmeny (copy, drobné opravy) je priamy push do `master` v poriadku.

## Stránky a súbory

| Súbor | Účel |
|---|---|
| `index.html` | Hlavná landing page (Hero, Stats, Features, How/Cenník, Referencie, FAQ, Contact, Footer) |
| `admin.html` | Admin panel (`/admin`) — Rezervácie, Referencie, Blokované termíny. Login cez `sessionStorage` token |
| `gdpr.html` | GDPR / ochrana osobných údajov |
| `vop.html` | Všeobecné obchodné podmienky |
| `cookies.html` | Cookie policy |
| `api/contact.js` | Vercel serverless: rezervačný formulár → email (Resend) + Supabase insert |
| `api/admin-login.js` | Admin auth (timing-safe porovnanie hesla) |
| `api/admin-data.js` | Admin CRUD (reservations/testimonials/blocked_dates) cez Supabase service key + upload-url endpoint pre fotky/videá |
| `gen-plan.js` | Node.js skript — vygeneruje `RaceZone-plan.docx` (historický názov, nesúvisí s webom) |

## Supabase

- Projekt: `pvtwsxgsvasxmflaogci` (pomenovaný "racezone" — historický názov, funkčne je to Bamper projekt), region eu-west-1
- URL: `https://pvtwsxgsvasxmflaogci.supabase.co`

Tabuľky:
- `reservations` — id, created_at, name, phone, email, package, date, date_end, type, time, prep, message, status (new/contacted/confirmed/declined), tier
- `testimonials` — id, created_at, name, role, body, approved, display_order, `media` (jsonb array `[{url, type}, ...]`, type je `image`/`video`)
- `blocked_dates` — id, created_at, date_from, date_to, label, reservation_id (FK na reservations, auto-vytvorené pri potvrdení rezervácie)

Storage bucket `testimonials` — public, 50MB limit na súbor, image/video mime types. Upload cez signed upload URL (mintuje ho `api/admin-data.js` cez service key, browser potom PUT-uje priamo do Supabase — obchádza Vercel function body limit ~4.5MB, dôležité pre video).

## Vercel env vars

- `RESEND_API_KEY` — Resend API kľúč
- `CONTACT_EMAIL` — Igorov email pre notifikácie (info@bamper.sk)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `ADMIN_PASSWORD` — heslo pre `/admin` (Igor pozná)

## Admin panel (`/admin`)

Tri záložky:
- **Rezervácie** — zoznam, zmena statusu (select), zamietnuté (`declined`) majú tlačidlo "Zmazať"
- **Referencie** — pridávanie/editovanie testimonialov, multi-file upload fotiek/videí (chips s × pred uploadom, galéria s per-item × na existujúcich), inline "Upraviť" formulár na text/poradie
- **Blokované termíny** — pridávanie/editovanie/mazanie, inline "Upraviť" formulár

Reservation workflow: PATCH status → `confirmed` auto-blokuje dátumy (insert do `blocked_dates` s `reservation_id`) + email zákazníkovi; `declined` zmaže blok + email zákazníkovi.

Mobilný layout: `.card-header` sa pod 640px stackuje vertikálne (predtým sa action tlačidlá odrezávali mimo viditeľnú oblasť), tab bar je horizontálne scrollovateľný.

## Verejná stránka — Referencie sekcia

Sekcia medzi Cenníkom a FAQ, `display:none` a zobrazí sa len ak existuje aspoň 1 schválená (`approved=true`) referencia — vedomé rozhodnutie, nezobrazovať social proof kým neexistuje. Nav link "Referencie" (desktop aj mobil) je rovnako podmienene skrytý/zobrazený. Klik na fotku otvára fullscreen lightbox s prev/next navigáciou medzi fotkami tej istej referencie. Schválené referencie sa dynamicky vkladajú do LocalBusiness JSON-LD ako `review` pole (bez vymyslených hodnotení — hviezdičky sa nezbierajú).

## SEO

Meta keywords tag sa nepoužíva (Google ho ignoruje) — kľúčové slová sa vkladajú do title/meta description/OG/Twitter/nadpisov/body copy/FAQ prirodzene. Cieľové výrazy: nafukovacie atrakcie, nafukovacia trať, nafukovací mantinel, detská bugina, detská elektroštvorkolka, Košice.

## Design systém

CSS premenné definované v `:root` v každom HTML súbore — pri pridávaní novej stránky ich treba skopírovať:

```css
--red: #E8141B;
--red-d: #bf0a10;
--ink: #15171c;
--ink-soft: #3a3d44;
--muted: #3a3d44;
--line: #ececee;
--bg: #ffffff;
--soft: #f6f6f7;
--display: 'Sora', system-ui, sans-serif;
--body: 'Manrope', system-ui, sans-serif;
```

Fonty: **Sora** pre nadpisy/display, **Manrope** pre text. Farebná schéma: čierna + červená (#E8141B) + biela. Bez emoji. Vozidlá sa v customer-facing copy vždy volajú "autíčka" (nie "buginy") — pozri feedback memory pre kontext.

## Bezpečnosť

- Admin API (`api/admin-data.js`, `api/admin-login.js`): timing-safe porovnanie hesla (`crypto.timingSafeEqual`), CORS obmedzené na bamper.sk/www.bamper.sk, UUID validácia `id` parametra pred použitím v PostgREST URL
- `resend-key.txt` a `.env*` nikdy necommitovať — sú v `.gitignore`
