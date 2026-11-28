# Ghid detaliat Windows — ZERA Stage 1

## PostgreSQL

1. Instalați [PostgreSQL for Windows](https://www.postgresql.org/download/windows/) sau Docker Desktop + imaginea `postgres`.
2. Notați userul, parola și portul (implicit `5432`).
3. Creați baza:

```sql
CREATE DATABASE zera;
```

În pgAdmin: click dreapta pe *Databases* → *Create* → *Database* → nume `zera`.

## AUTH_SECRET pe PowerShell

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Copiați rezultatul în `.env` la `AUTH_SECRET=...`.

## Verificare după seed

```bat
npx prisma studio
```

Ar trebui să vedeți tabelul `User` cu rolul `ADMIN` (și opțional `MANAGER`).

## Probleme frecvente

| Simptom | Verificare |
| --- | --- |
| Eroare la `prisma migrate` | `DATABASE_URL` greșit; serviciul PostgreSQL pornit; baza `zera` există |
| Login eșuează mereu | Ați rulat `npm run db:seed`? Emailul din seed e cel pe care îl introduceți? |
| Redirect buclă / 500 pe `/admin` | `AUTH_SECRET` lipsește sau s-a schimbat după o sesiune existentă — setați secretul și reîncercați login |
| Port 3000 ocupat | `npm run dev -- -p 3001` |
