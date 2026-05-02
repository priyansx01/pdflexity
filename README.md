# Electron + Next.js (pnpm monorepo)

Production-ready desktop application with Electron and Next.js, managed as a pnpm monorepo.

## Architecture

```
electron-next-app/
├── apps/
│   ├── electron/          # Electron main process (Node.js / TypeScript)
│   │   ├── src/
│   │   │   ├── main.ts    # App entry — creates BrowserWindow
│   │   │   ├── preload.ts # Secure IPC bridge (contextBridge)
│   │   │   ├── ipc.ts     # IPC handler registration
│   │   │   ├── menu.ts    # Native application menu
│   │   │   └── updater.ts # Auto-update logic
│   │   └── forge.config.ts
│   └── renderer/          # Next.js frontend (React / TypeScript)
│       └── src/app/       # App Router pages
├── packages/
│   └── shared/            # Shared TypeScript types
├── package.json           # Root workspace
└── pnpm-workspace.yaml
```

## Security Model

- `contextIsolation: true` — renderer cannot access Node.js APIs directly
- `nodeIntegration: false` — no Node.js in renderer process
- `sandbox: true` — renderer runs in OS-level sandbox
- All IPC calls go through `contextBridge` in `preload.ts`
- Electron Fuses harden the binary (no `ELECTRON_RUN_AS_NODE`, asar integrity, etc.)

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8 (`npm install -g pnpm`)

### Install

```bash
pnpm install
```

### Development

Starts Next.js dev server (port 3000) and Electron simultaneously:

```bash
pnpm dev
```

### Production Build

```bash
# 1. Build Next.js static export
pnpm --filter renderer build

# 2. Compile Electron TypeScript
pnpm --filter electron build

# 3. Package into distributable
pnpm --filter electron make
```

Outputs are in `apps/electron/out/`.

## Adding IPC Methods

**1. Add handler in `apps/electron/src/ipc.ts`:**
```ts
ipcMain.handle("myfeature:do-something", async (_event, arg: string) => {
  return `result: ${arg}`;
});
```

**2. Expose via preload in `apps/electron/src/preload.ts`:**
```ts
contextBridge.exposeInMainWorld("electronAPI", {
  // ...existing methods
  doSomething: (arg: string): Promise<string> =>
    ipcRenderer.invoke("myfeature:do-something", arg),
});
```

**3. Update types in `apps/renderer/src/electron-env.d.ts`:**
```ts
interface ElectronAPI {
  // ...existing methods
  doSomething: (arg: string) => Promise<string>;
}
```

**4. Call from React:**
```ts
const result = await window.electronAPI.doSomething("hello");
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

| Variable | Description |
|----------|-------------|
| `UPDATE_FEED_URL` | Electron auto-update feed URL |
| `NEXT_PUBLIC_APP_NAME` | App name exposed to renderer |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev mode (Next.js + Electron) |
| `pnpm build` | Build all packages |
| `pnpm package` | Package app without installers |
| `pnpm make` | Build platform installers |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm clean` | Clean all build artifacts |

## Distribution

Electron Forge creates installers for all platforms:

- **Windows**: `.exe` (Squirrel)
- **macOS**: `.dmg`
- **Linux**: `.deb`, `.rpm`

Run on each target platform (cross-compilation not supported):

```bash
pnpm make
```
