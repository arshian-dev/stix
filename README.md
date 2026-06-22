# Stix Workspace

**Stix** is a local-first Markdown workspace built for focused writing, offline reliability, and complete ownership of your data.

Designed around a **Cloudless Architecture**, Stix demonstrates how modern browser APIs can deliver document management, media handling, version control, search, and encrypted backups without relying on external servers or databases.

All documents, media assets, search indexes, and version histories remain on-device by default.

---

## Cloudless Architecture

### Local-First Storage

Stix uses `localForage` to interact directly with the browser's native `IndexedDB`.

Every keystroke, title change, and workspace modification is automatically persisted locally, enabling instant saves, offline operation, and complete user ownership of data.

Because storage is entirely local, Stix requires no accounts, backend services, or cloud infrastructure.

### Dual-Database Asset Pipeline

To maintain a responsive editing experience, Stix separates textual and binary content into independent storage layers.

#### Document Store

Stores Markdown documents, metadata, tags, and workspace state.

#### Media Store

A dedicated IndexedDB instance responsible for binary `Blob` assets.

When an image is dropped into the editor:

1. The file is intercepted before rendering.
2. The raw binary data is stored as a Blob.
3. A local object URL is generated.
4. The document is updated asynchronously using the generated reference.

This separation prevents large media assets from impacting editor performance while keeping document operations lightweight.

---

## Workspace Search Engine

Powered by `Fuse.js`, Stix includes a fully local fuzzy-search engine capable of indexing document titles, content, and tags.

Features include:

* Instant workspace-wide search
* Weighted relevance scoring
* Automatic `#tag` extraction
* Keyboard-first navigation
* Command Palette (`Cmd+K` / `Ctrl+K`)

All indexing and search operations execute entirely on-device.

---

## Version History

Stix features a dual-scope version control engine allowing revision tracking at both the document and workspace levels.

### Snapshots

Create named checkpoints with custom commit messages for either the active file or the entire workspace simultaneously.

### Branching

Create alternate drafts or workspace states from any historical revision without modifying the original documents.

### Diff Viewer

Visualize line-by-line changes between revisions using syntax-aware comparisons powered by the \`diff\` library, including concatenated multi-file diffs for workspace commits.

### Restoration

Restore any previous snapshot instantly, whether reverting a single file or rehydrating an entire workspace to a past state.

This enables experimentation and long-form drafting without fear of losing work.

---

## Encrypted `.stix` Vault Format

Stix includes a complete client-side backup and restoration system designed for portability and long-term archival.

### Export Pipeline

During export:

1. The user selectively chooses which documents to include via the Export Modal.
2. Documents, revision history, and media assets are collected (omitting global workspace history during partial exports to ensure privacy).
3. Binary media is serialized using the \`FileReader\` API.
4. The workspace archive is encrypted using AES encryption.
5. The encrypted archive is compressed using the browser's native \`CompressionStream('gzip')\` API.
6. The resulting payload is packaged as a portable \`.stix\` vault.

### Import Pipeline

When restoring a vault:

1. The archive is decompressed using `DecompressionStream('gzip')`.
2. The user provides the vault password.
3. The encrypted workspace is decrypted locally.
4. Existing local databases are cleared.
5. Documents, revision history, and media assets are reconstructed.
6. The application state is refreshed without requiring a page reload.

The resulting vault preserves an entire workspace—including embedded media and historical revisions—in a single portable file.

---

## Editor Experience

### Live Markdown Rendering

A split-view workspace provides real-time Markdown rendering while maintaining independent scroll positions between editor and preview.

### Cyber-Neon Syntax Themes

Built on `PrismJS`, Stix includes five dynamically switchable syntax themes:

* Cyber Lime
* Neon Pink
* Electric Blue
* Toxic Green
* Laser Red

### Typography Controls

Switch instantly between:

* Monospace
* Sans Serif
* Serif

to match different writing styles and workflows.

### Focus-Oriented Layout

Large vertical scroll margins create a typewriter-style writing experience that keeps active content comfortably centered during extended writing sessions.

---

## Technology Stack

* React
* Vite
* localForage
* IndexedDB
* Fuse.js
* PrismJS
* CryptoJS
* CompressionStream API
* DecompressionStream API

---

## Running Stix Locally

No environment variables, backend services, databases, or cloud configuration are required.

```bash
npm install

npm run dev

npm run build
```

---

**Stix — A local-first workspace built entirely on browser-native infrastructure.**
