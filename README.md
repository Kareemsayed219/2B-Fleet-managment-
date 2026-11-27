# 2B Fleet

Fleet management system for 2B: vehicles, drivers and runners, assignments, and (in later stages) odometer, fuel, runner trips and pay, driver cash, maintenance, and a manager dashboard.

Arabic and English, right-to-left aware, works on phone and desktop.

## Stack

- Next.js (App Router) web app, installable on phones (PWA manifest)
- Supabase: Postgres, Auth, row-level security per role
- Hosting: Vercel

## Roles

| Role | Sees and does |
| --- | --- |
| manager | everything, plus users, roles and activation |
| admin | vehicles, drivers, assignments, imports, driver logins |
| driver / runner | only their own record and the vehicle assigned to them today |
| pending | nothing until a manager activates the account |

Access is enforced in the database (RLS policies in `supabase/migrations`), not only in the UI.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values from Supabase > Project Settings > API.
2. `npm install && npm run dev`
3. Open `/setup` once to create the first manager account. The first account created becomes the manager; every later sign-up is `pending`.
4. In Supabase > Authentication > Providers > Email, turn off "Allow new users to sign up" after the manager exists. Admins create all other logins from the app.

Logins for drivers, runners and admins are created by the `create-login` Supabase Edge Function (`supabase/functions/create-login`). It reads the secret key from Supabase's own environment, so the web app never holds it and no service-role key is needed in Vercel. The function re-checks the caller: manager or admin for driver logins, manager only for admin logins.

## Logins

Drivers and runners sign in with their phone number and a password set by an admin. Internally the phone maps to `<phone>@phone.2b-fleet.local`, so no SMS provider is needed.

## Importing from sheets

Vehicles and drivers can be pasted straight from Excel or Google Sheets on the Import pages. Rows are matched by plate (vehicles) or phone (drivers), so re-importing updates instead of duplicating.

## Database migrations

SQL files in `supabase/migrations` are applied in order. They are already applied to the `2b-fleet` Supabase project.
