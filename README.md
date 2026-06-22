# Stix Workspace

**Stix** is a premium, distraction-free Markdown environment engineered for high-performance writing, absolute data privacy, and aggressive visual aesthetics. 

Designed entirely around a **Cloudless Architecture**, Stix proves that modern web applications can deliver enterprise-grade state management, multimedia processing, and asset portability without ever relying on an external backend or database.

---

## Cloudless Architecture & Engineering

### Zero-Latency Local Storage
Stix utilizes `localForage` to interact directly with your browser's native `IndexedDB`. Every keystroke, title change, and file creation is instantaneously auto-saved locally. Your data mathematically cannot be breached because it never leaves your machine. 

### Dual-Database Asynchronous Asset Pipeline
To maintain sub-millisecond typing latency, Stix separates state boundaries:
1. **Primary Store**: Manages the lightweight array of your text-based Markdown documents.
2. **Binary Media Store**: A dedicated IndexedDB instance configured exclusively for handling binary `Blob` objects. When you drag-and-drop an image into the editor, it is intercepted, saved directly as a raw binary blob to the `mediaStore`, and seamlessly injected into your text via an asynchronous interceptor (`AsyncImage`) using local object URLs. 

### 🔍 Workspace Search Engine
Integrated with `fuse.js`, Stix features a blazing-fast, local fuzzy search engine. It intelligently parses `#tags` directly from your Markdown content for weighted tag-indexing, instantly traversing your entire workspace and content bodies via a sleek `Cmd+K` Command Palette overlay.

### 🌳 Git for Notes (Version History)
Every document in Stix maintains its own independent history graph:
- **Snapshots**: Take discrete commits with custom messages.
- **Branching**: Safely branch out (e.g., `draft-v2`) from any past commit without destroying the original text.
- **Diff Viewer**: Utilizes the robust `diff` library to provide beautiful, syntax-highlighted line-by-line comparisons between commits.
- **Time Travel**: Instantly restore your working tree to any historical snapshot.

### 🔐 The `.stix` AES-256 Encrypted Vault
Stix implements an advanced, native client-side Backup and Restore pipeline:
- **AES-256 Encryption**: Powered by `crypto-js`, your entire workspace—including text, version history, and binary media assets—is strictly encrypted with military-grade AES-256 before ever touching the filesystem.
- **Base64 Serialization**: During export, Stix dynamically extracts all binary blobs from your `mediaStore` and converts them into serialized Base64 strings natively via the `FileReader` API.
- **Native GZIP Streaming**: The unified encrypted JSON archive is piped through the browser's native `CompressionStream('gzip')` API.
- **Proprietary File Wrapper**: The heavily compressed ciphertext stream is downloaded as a custom portable `.stix` vault.
- **Millisecond Rehydration**: Uploading a `.stix` file passes the stream through `DecompressionStream('gzip')`, prompts for your password to securely decrypt the ciphertext, completely wipes the active local databases to prevent ghosting, and instantly reconstructs the optimized browser blobs—refreshing the React layout with zero page reloads.

---

## Luxury User Experience

- **Cyber-Neon Syntax**: Built upon `PrismJS`, Stix features a custom syntax highlighting engine that dynamically binds to 5 hot-swappable Cyber-Neon color palettes (Cyber Lime, Neon Pink, Electric Blue, Toxic Green, Laser Red).
- **Independent Scroll Panes**: The raw editor and the live-preview markdown renderer operate completely independently, ensuring you never lose your place.
- **Deep Scroll Margins**: Both viewports feature an aggressive `50vh` bottom padding, enabling "typewriter mode" where your active line can remain perfectly centered on your monitor at all times.
- **Live Typography**: Instantly toggle between Mono, Sans, and Serif font families to match your creative flow.

---

## Running Stix Locally

Because Stix is completely cloudless, running it requires zero environment variables, zero database credentials, and zero backend configuration.

\`\`\`bash
# Install Dependencies
npm install

# Run the local Vite dev server
npm run dev

# Compile for production
npm run build
\`\`\`

---

*Stix — The universe in a local variable.*
