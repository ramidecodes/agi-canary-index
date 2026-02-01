# AGI Canary Index

A system that tracks AI/AGI progress by ingesting from trusted sources, extracting capability signals via AI, and visualizing progress across cognitive axes, generalization benchmarks, and autonomy risk.

## Overview

The AGI Canary Index consolidates established frameworks—Hendrycks cognitive domains (CHC), Levels of AGI, ARC-AGI, METR autonomy evaluations, OECD capability indicators—into a single auditable index. It:

- **Discovers** content from RSS feeds, curated sources, search, and X
- **Acquires** full-text articles via Firecrawl and stores them in R2
- **Extracts** claims and signals (axis deltas, citations) using AI
- **Aggregates** daily snapshots of capability scores across cognitive axes

Every displayed score links to citations and provenance for transparency.

## Architecture

| Component    | Stack                                          |
| ------------ | ---------------------------------------------- |
| **App**      | Next.js 16, Vercel                             |
| **Pipeline** | Cloudflare Workers (Discovery + Acquisition)   |
| **Database** | Neon Postgres, Drizzle ORM                     |
| **Storage**  | Cloudflare R2 (documents)                      |
| **Auth**     | Clerk                                          |
| **AI**       | Vercel AI SDK + OpenRouter (signal extraction) |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Neon Postgres database
- Clerk account (for admin auth)
- Firecrawl API key
- OpenRouter API key

### Installation

```bash
pnpm install
cp .env.example .env
# Edit .env with your credentials
```

### Database

```bash
pnpm db:migrate
pnpm db:seed
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Admin UI at `/admin` (requires Clerk sign-in).

### Pipeline (Cloudflare Worker)

```bash
pnpm worker:dev       # Local development
pnpm worker:deploy    # Deploy to Cloudflare
```

## Scripts

| Script                 | Description                   |
| ---------------------- | ----------------------------- |
| `pnpm dev`             | Next.js dev server            |
| `pnpm build`           | Next.js production build      |
| `pnpm db:generate`     | Generate Drizzle migration    |
| `pnpm db:migrate`      | Apply migrations              |
| `pnpm db:push`         | Push schema (dev)             |
| `pnpm db:studio`       | Drizzle Studio                |
| `pnpm db:seed`         | Seed sources                  |
| `pnpm worker:dev`      | Run pipeline Worker locally   |
| `pnpm worker:deploy`   | Deploy pipeline to Cloudflare |
| `pnpm infra:provision` | Create R2 bucket              |
| `pnpm infra:deploy`    | Deploy Workers                |
| `pnpm infra:secrets`   | Set wrangler secrets          |
| `pnpm lint`            | Biome check                   |
| `pnpm format`          | Biome format                  |

## Documentation

| Document                                                                   | Description                            |
| -------------------------------------------------------------------------- | -------------------------------------- |
| [docs/STRUCTURE.md](docs/STRUCTURE.md)                                     | Project structure and directory layout |
| [docs/features/00-feature-roadmap.md](docs/features/00-feature-roadmap.md) | Feature roadmap and phases             |
| [docs/AUTH.md](docs/AUTH.md)                                               | Authentication (Clerk)                 |
| [docs/DATABASE.md](docs/DATABASE.md)                                       | Schema, migrations, JSONB shapes       |
| [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)                           | Neon, Vercel, Cloudflare, R2           |
| [docs/DISCOVERY.md](docs/DISCOVERY.md)                                     | Discovery pipeline                     |
| [docs/ACQUISITION.md](docs/ACQUISITION.md)                                 | Acquisition pipeline                   |
| [docs/SIGNAL-PROCESSING.md](docs/SIGNAL-PROCESSING.md)                     | AI signal extraction                   |
| [docs/MODELS.md](docs/MODELS.md)                                           | AI model IDs                           |

## License

See [LICENSE](LICENSE).
