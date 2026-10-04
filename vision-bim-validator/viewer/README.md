# Vision BIM Validator frontend

Spanvision Infra's React/TypeScript BIM workspace. See the root README.md for full startup, architecture, integration, and verification details.

Requires Node.js 22 or later. Install with `npm ci`, build with `npm run build`, and use `npm run dev -- --port 5188` for frontend development. The development proxy targets the validation backend on port 8000 by default; `VISION_API_TARGET` overrides it.

Brand identity lives in `src/config/brand.ts`. The Spanvision Mono palette lives in `src/themes.css`, with component and responsive rules in `src/styles/mono.css`. Account integration options are documented in `.env.example`.