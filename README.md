# YARD-3D

Live 3D view of an APM Terminals yard and quay side (APMT Mumbai), part of the Compass family.

- Vessel at berth worked by STS cranes
- RTG blocks, reefer yard (reach stackers), empty depot (empty handlers)
- Terminal tractors between quay and yard, external trucks through the gate
- Click any machine, block or the vessel to follow it and see live details

All data is simulated (`lib/sim.ts`); the layout and fleet are defined in `lib/terminal.ts`.

## Run

```bash
npm install
npm run dev
```

Stack: Next.js 16, React 19, Tailwind CSS 4, react-three-fiber.

The Maersk Text / Maersk Headline fonts in `app/fonts` are licensed for Maersk use only.
