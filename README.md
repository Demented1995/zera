# ZERA

Platformă web pentru oglinzi personalizate și oglinzi LED.

**Stage 1 (fundație):** Next.js (App Router) + TypeScript + Tailwind CSS, shadcn/ui, PostgreSQL + Prisma, autentificare securizată cu roluri `ADMIN` și `MANAGER`, rute admin protejate.

## Cerințe (Windows)

- [Node.js 20 LTS+](https://nodejs.org/) (include `npm`)
- PostgreSQL 14+ (instalare locală sau Docker Desktop)
- Git

## Pornire rapidă pe Windows

### 1. Clone și dependențe

În **PowerShell** sau **Command Prompt**:

```bat
git clone https://github.com/Demented1995/zera.git
cd zera
npm install
```

### 2. Variabile de mediu

```bat
copy .env.example .env
```

Editați `.env` și setați cel puțin:

- `DATABASE_URL` — conexiune PostgreSQL (exemplu: `postgresql://postgres:PAROLA@localhost:5432/zera?schema=public`)
- `AUTH_SECRET` — șir aleator lung (nu folosiți valoarea din exemplu)
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — contul admin inițial

Creați baza de date `zera` în PostgreSQL dacă nu există.

### 3. Schema și utilizator seed

```bat
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Server de dezvoltare

```bat
npm run dev
```

Deschideți [http://localhost:3000](http://localhost:3000) — veți fi redirecționați la `/login`. După autentificare ajungeți la `/admin`.

## Scripturi utile

| Comandă | Rol |
| --- | --- |
| `npm run dev` | Server dezvoltare |
| `npm run build` | Build producție |
| `npm run start` | Pornește build-ul |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificare TypeScript |
| `npm run db:migrate` | Migrări Prisma |
| `npm run db:seed` | Creează/actualizează userii din `.env` |
| `npm run db:studio` | UI Prisma Studio |

## Structură (Stage 1)

```
src/
  app/                 # Rute App Router (login, admin, API auth)
  components/          # UI (shadcn) + componente auth
  lib/                 # Auth, DB, utilitare partajate
  modules/             # Module pe domeniu (extensibile în etapele următoare)
prisma/                # Schema, migrări, seed
```

## Securitate

- Nu există parole hardcodate în cod.
- Parolele sunt stocate ca hash bcrypt.
- Conturile de bootstrap vin doar din variabilele de mediu (seed).
- Rutele `/admin` sunt protejate (middleware + verificare pe server).

## Ce NU este în Stage 1

Materiale, prețuri, configurator, magazin online sau date demo pentru funcții viitoare.
