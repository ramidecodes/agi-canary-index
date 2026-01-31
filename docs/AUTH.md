# Authentication

## Plan

Admin features (Source Registry, manual pipeline trigger) will use [Clerk](https://clerk.com/) when implemented.

## Scope

- **Admin UI:** `/admin/sources` and pipeline trigger endpoints require authenticated admin users
- **Public pages:** Home, Capabilities, Autonomy, Timeline, Signal Explorer, News remain public
- **Implementation:** Add Clerk when building the admin interface (Phase 1-2)

## References

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Next.js](https://clerk.com/docs/quickstarts/nextjs)
