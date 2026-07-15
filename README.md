# SatsTerminal UI registry example

This Next.js application demonstrates the production SatsTerminal Borrow UI
registry. Its components are sourced from:

```text
https://ui.satsterminal.com/r/{name}.json
```

The `@satsterminal` namespace is configured in `components.json`. There are no
localhost or local-filesystem registry sources in this project.

## Install the registry blocks

In a clean checkout or project, install every top-level block used by this
example with:

```bash
npm run registry:install
```

To deliberately replace the checked-in component files with the current
production versions, run:

```bash
npm run registry:sync
```

`registry:sync` passes the shadcn CLI's `--overwrite` flag, so review any local
component customizations before running it.

The complete one-page flow installs all supporting components as transitive
registry dependencies:

```bash
npx shadcn@latest add @satsterminal/borrow-app
```

Individual atomic blocks remain available when a custom composition is needed:

```bash
npx shadcn@latest add @satsterminal/wallet-withdrawal
```

## Run the example

Create `.env.local` with your SDK API key:

```bash
NEXT_PUBLIC_SATSTERMINAL_API_KEY=your_api_key
```

Then install dependencies and start the application:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). This localhost address is
only the example application's development server; registry resources still
come from `https://ui.satsterminal.com`.
