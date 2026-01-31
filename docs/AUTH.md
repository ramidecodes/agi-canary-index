# Authentication

## Implementation

Admin features are protected with [Clerk](https://clerk.com/). The app uses `@clerk/nextjs`: `ClerkProvider` in the root layout, `clerkMiddleware` in `src/middleware.ts`, and in-app sign-in/sign-up pages.

## Protected routes

- **`/admin(.*)`** — All admin UI (Source Registry, etc.). Unauthenticated users are redirected to sign-in.
- **`/api/admin(.*)`** — All admin API routes. Unauthenticated requests receive 401 (middleware redirects or route handler `requireAuth()`).

## Public routes

- **`/`** — Home
- **`/sign-in`**, **`/sign-up`** — Clerk sign-in/sign-up pages (anyone can access to authenticate)
- Future public pages (Capabilities, Autonomy, Timeline, Signal Explorer, News) remain public.

## Sign-in and sign-up

- **Sign-in:** `/sign-in` — Renders Clerk’s `<SignIn />` component.
- **Sign-up:** `/sign-up` — Renders Clerk’s `<SignUp />` component.
- After sign-in or sign-up, users are redirected to `/admin/sources` when the optional env vars are set (see below).

## Environment variables

See `.env.example`. Required for Clerk:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — From [Clerk Dashboard](https://dashboard.clerk.com) → API keys.
- `CLERK_SECRET_KEY` — From the same page (keep secret).

Optional (recommended for in-app auth and redirects):

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin/sources`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/admin/sources`

## Defense-in-depth

Admin API route handlers call `requireAuth()` from `src/lib/auth.ts` at the start of each handler. If the user is not signed in, the handler returns 401. This ensures API routes reject unauthenticated requests even if middleware is misconfigured or bypassed.

## References

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Next.js](https://clerk.com/docs/quickstarts/nextjs)
