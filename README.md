# 📄 pdflexity

**pdflexity** is a fast, privacy-first PDF toolkit built with **Electron.js + Next.js**, powered by a **Golang processing engine** for high-performance local document operations.

> ⚡ No uploads. No servers. Your files stay on your machine.

---

## 🚀 Why pdflexity?

Most online PDF tools require uploading sensitive documents to remote servers — which introduces **privacy risks**, **latency**, and **file size limits**.

**pdflexity solves this by:**

* Processing everything **locally on your device**
* Using **Golang for CPU-efficient operations**
* Delivering a **premium, native desktop experience** via Electron

---

## ✨ Features

* 📎 **Merge PDFs & Images**: Drag, drop, and seamlessly combine PDFs and image formats.
* 🔐 **Protect & Unlock PDFs**: Add or remove password protection from your sensitive documents.
* 🔍 **Compare PDFs**: Visually inspect the differences between two documents.
* 🖼 **Card-based UI with Live Previews**: Render actual document thumbnails directly in the grid.
* ⚡ **High-performance Processing**: Instant operations powered by a dedicated Go engine.
* 📴 **100% Offline**: No cloud dependency, ensuring total data privacy.

---

## 🧱 Tech Stack

### Frontend (Renderer)

* **Next.js** (App Router)
* **React**
* **Tailwind CSS**
* **shadcn/ui**
* **Framer Motion** (Micro-animations)

### Desktop Layer

* **Electron.js** (Main Process + Secure Preload Bridge)

### Backend Engine (Local)

* **Golang**
* **pdfcpu** (Robust PDF processing)

---

## 🧠 Architecture

```text
User (Renderer UI)
      ↓
Electron Preload (Secure IPC Bridge)
      ↓
Electron Main Process
      ↓
Golang Binary (pdfcpu RPC Engine)
      ↓
Local File System
```

* The **renderer never accesses the file system directly**.
* All sensitive operations are handled via **secure IPC**.
* PDF processing is delegated to a long-running **Golang binary via standard input/output for maximum performance**.

---

## 🔐 Privacy First

* ❌ No file uploads
* ❌ No tracking of document content
* ❌ No external API calls for processing
* ✅ Everything runs locally

Your documents never leave your system — ideal for:

* Legal files
* Financial documents
* Internal company data

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/priyansx01/pdflexity.git
cd pdflexity
```

### 2. Install dependencies

This project uses `pnpm` as its package manager.

```bash
pnpm install
```

### 3. Build the Go Engine

The application relies on a local Go binary for PDF processing. You must build it before running the app:

```bash
cd services/pdf-engine
go build -o ../../apps/electron/bin/pdflexity-engine.exe ./cmd/pdflexity-engine/
cd ../..
```

### 4. Run development

Starts both the Next.js dev server and the Electron application concurrently:

```bash
pnpm dev
```

---

## ⚙️ Build (Production)

To build a standalone distributable for your platform:

```bash
# Build the Next.js static export
pnpm --filter renderer build

# Compile the Electron TypeScript code
pnpm --filter electron build

# Package the application
pnpm --filter electron make
```

---

## 🔌 IPC Architecture Example

The frontend securely communicates with the backend without exposing Node.js:

```ts
// preload.ts (Bridge)
contextBridge.exposeInMainWorld("electronAPI", {
  pdf: {
    merge: (files, fileName) => ipcRenderer.invoke("pdf:merge", files, fileName)
  }
});
```

```ts
// ipc/pdf/merge.ts (Main Process)
ipcMain.handle("pdf:merge", async (_event, buffers, names, fileName) => {
  // 1. Write buffers to temporary directory
  // 2. Send command to the Go binary via `goBridge`
  const result = await goBridge.send({ op: "merge", inputPaths, outputPath });
  // 3. Return Base64 data back to frontend
});
```

---

## 🎨 UI Philosophy

* **Desktop-first UX**: Built to feel like a native macOS/Windows application.
* **Premium Aesthetics**: Glassmorphism, smooth gradients, and carefully crafted micro-interactions.
* **Modern Grids**: Card-based interactions instead of boring lists.
* **Fluid Drag-and-Drop**: Built custom sensors to bypass Chromium pointer capture limitations.

---

## 🤝 Contributing

We welcome contributions!

### Steps:

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## 📄 License

MIT License

---

## 💡 Vision

To build the **fastest, most private PDF toolkit** that developers and professionals can trust — without compromising data security or user experience.

---

**Built for speed. Designed for privacy. Powered by Go.**
