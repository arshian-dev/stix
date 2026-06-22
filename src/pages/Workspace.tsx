import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import _Editor from 'react-simple-code-editor';
const Editor = (_Editor as any).default || _Editor;
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import localforage from 'localforage';
import Fuse from 'fuse.js';
import CryptoJS from 'crypto-js';
import { VersionControl } from '../components/VersionControl';

// 1. Configure localForage Namespace
localforage.config({
  name: 'stix-app',
  storeName: 'workspace_store'
});

const mediaStore = localforage.createInstance({
  name: 'stix-app',
  storeName: 'media_store'
});

export interface StixCommit {
  id: string;
  timestamp: string;
  message: string;
  content: string;
  parentId: string | null;
}

export interface StixBranch {
  name: string;
  headCommitId: string | null;
}

export interface StixFile {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  commits?: StixCommit[];
  branches?: StixBranch[];
  activeBranch?: string;
}

export interface WorkspaceCommit {
  id: string;
  timestamp: string;
  message: string;
  snapshot: StixFile[];
  parentId: string | null;
}

export interface WorkspaceBranch {
  name: string;
  headCommitId: string | null;
}

export interface WorkspaceHistory {
  commits: WorkspaceCommit[];
  branches: WorkspaceBranch[];
  activeBranch: string;
}

const STORAGE_KEY = 'stix_files';
const LEGACY_STORAGE_KEY = 'stix_draft';
const WS_HISTORY_KEY = 'stix_workspace_history';

const USER_MANUAL_MD = `# Welcome to the Stix Workspace

Stix is a premium, distraction-free Markdown environment engineered for high-performance writing, absolute data privacy, and aggressive visual aesthetics.

## Core Features
- **Local-First Architecture:** Everything you type is instantaneously auto-saved to your browser's IndexedDB. Your data never leaves your machine.
- **Dynamic Themes:** Click the THEME button in the header to hot-swap between 5 custom Cyber-Neon palettes. All UI elements and syntax highlighting engines update instantly.
- **Typography:** Select between MONO, SANS, and SERIF font families in the header to suit your writing style.
- **Independent Panes:** The editor and live-preview windows scroll completely independently.
- **Deep Scroll Margin:** Both panes feature a 50vh bottom padding, allowing you to keep your active typing line perfectly centered on your monitor.

## Workspace Search Engine
Hit \`Cmd+K\` (or click **SEARCH**) to launch the fuzzy-search Command Palette. It instantly traverses all your documents, titles, and automatically indexed \`#tags\`.

## Git for Notes (Version History)
Click **VERSION HISTORY** in the sidebar to open the Version Control modal.
- **Dual-Scope Toggle:** Manage history for just the active **File**, or switch to **Workspace** scope to snapshot all files simultaneously!
- **Branching & Time Travel:** Safely branch your drafts, view line-by-line colored diffs of what changed, and restore past versions with a single click.

## Multimedia & Assets
You can drag-and-drop or paste images directly into the editor. Stix intercepts the file, saves the binary directly to a dedicated local media store, and generates a fast local reference link. Your images never hit a remote server.

## Code Syntax
Stix uses a deeply integrated Prism.js engine. Fenced code blocks perfectly adopt your chosen neon theme:

\`\`\`javascript
// The syntax theme dynamically binds to your Cyber-Neon palette!
export function initWorkspace() {
  const vault = new LocalVault();
  return vault.mount();
}
\`\`\`

## Encrypted Vault Backups
At the bottom of your sidebar, you will find the **Vault** controls for portable workspace snapshots.
- **↓ BACKUP:** Choose exactly which files to export. Your payload is securely encrypted using military-grade **AES-256** before being dynamically compressed via GZIP into a portable \`.stix\` file. *(Note: Partial exports safely strip global workspace history to protect the privacy of your excluded files).*
- **↑ RESTORE:** Upload a \`.stix\` file, provide your decryption password, and instantly rehydrate your entire workspace with zero layout flash.

## File Export
In the top right header, you can export your active document in two formats:
- **< > MD:** Export the raw markdown string.
- **[ ] HTML:** Export a completely standalone, statically-rendered HTML file with inline Cyber-Neon CSS styling baked directly into the document.

Start writing by clicking + NEW FILE in the sidebar!`;

const PALETTES = [
  { name: 'Cyber Lime', fixed: '#c3f400', dim: '#abd600', on: '#161e00' },
  { name: 'Neon Pink', fixed: '#ff00a0', dim: '#cc0080', on: '#330020' },
  { name: 'Electric Cyan', fixed: '#00f0ff', dim: '#00c0cc', on: '#003033' },
  { name: 'Neon Purple', fixed: '#b026ff', dim: '#8c1ecc', on: '#230733' },
  { name: 'Atomic Orange', fixed: '#ff6b00', dim: '#cc5500', on: '#331500' }
];

const FONTS = [
  { name: 'MONO', family: '"JetBrains Mono", monospace' },
  { name: 'SANS', family: '"Inter", sans-serif' },
  { name: 'SERIF', family: 'Georgia, serif' }
];

// 4. Async Image Interceptor
function AsyncImage({ src, alt, ...props }: any) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    const fetchBlob = async () => {
      try {
        const id = src.replace('local://', '');
        let blob = await mediaStore.getItem<Blob>(id);

        // Silent Migration Fallback
        if (!blob) {
          blob = await localforage.getItem<Blob>(id);
          if (blob) {
            await mediaStore.setItem(id, blob);
            await localforage.removeItem(id);
          }
        }

        if (blob && active) {
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (e) {
        console.error('Failed to load local asset', e);
      }
    };

    if (src && src.startsWith('local://')) {
      fetchBlob();
    } else {
      setBlobUrl(src);
    }

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [src]);

  if (!blobUrl) {
    return (
      <div className="w-full h-48 bg-surface-container-highest animate-pulse rounded-sm flex items-center justify-center text-on-surface-variant font-label-sm border border-neutral-800 my-6">
        LOADING ASSET...
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className="max-w-full rounded-sm border border-neutral-800 my-6" {...props} />;
}


export function Workspace() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [files, setFiles] = useState<StixFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileViewMode, setMobileViewMode] = useState<'edit' | 'preview'>('edit');
  const [isVersionControlOpen, setIsVersionControlOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());

  const [workspaceHistory, setWorkspaceHistory] = useState<WorkspaceHistory>({
    commits: [],
    branches: [{ name: 'main', headCommitId: null }],
    activeBranch: 'main'
  });

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fuse.js Indexing
  const searchIndex = useMemo(() => {
    const processedFiles = (Array.isArray(files) ? files : []).map(f => {
      const tagMatches = (f.content || '').match(/#[a-zA-Z0-9_-]+/g) || [];
      const tags = [...new Set(tagMatches)].map(t => t.substring(1));
      return { ...f, tags };
    });
    
    return new Fuse(processedFiles, {
      keys: [
        { name: 'tags', weight: 2 },
        { name: 'title', weight: 1.5 },
        { name: 'content', weight: 1 }
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeMatches: true
    });
  }, [files]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchIndex.search(searchQuery).slice(0, 10);
  }, [searchQuery, searchIndex]);

  // Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);
  
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else if (!isSearchOpen) {
      setSearchQuery('');
    }
  }, [isSearchOpen]);

  // Theme State
  const [themeIdx, setThemeIdx] = useState<number>(() => {
    const saved = localStorage.getItem('stix_theme_idx');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  // Font State
  const [fontIdx, setFontIdx] = useState<number>(() => {
    const saved = localStorage.getItem('stix_font_idx');
    return saved ? parseInt(saved, 10) : 0;
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Apply Theme CSS Variables
  useEffect(() => {
    const theme = PALETTES[themeIdx] || PALETTES[0];
    document.documentElement.style.setProperty('--color-primary-fixed', theme.fixed);
    document.documentElement.style.setProperty('--color-primary-fixed-dim', theme.dim);
    document.documentElement.style.setProperty('--color-on-primary-fixed', theme.on);
    localStorage.setItem('stix_theme_idx', themeIdx.toString());
  }, [themeIdx]);

  // Apply Font CSS Variable
  useEffect(() => {
    const font = FONTS[fontIdx] || FONTS[0];
    document.documentElement.style.setProperty('--font-family-body', font.family);
    localStorage.setItem('stix_font_idx', fontIdx.toString());
  }, [fontIdx]);

  // 2. State Async Migration & Hydration
  useEffect(() => {
    const hydrateState = async () => {
      try {
        const storedFiles = await localforage.getItem<StixFile[]>(STORAGE_KEY);
        const storedWsHistory = await localforage.getItem<WorkspaceHistory>(WS_HISTORY_KEY);
        
        if (storedWsHistory) {
          setWorkspaceHistory(storedWsHistory);
        }

        if (storedFiles && Array.isArray(storedFiles) && storedFiles.length > 0) {
          setFiles(storedFiles);
          // Open the most recently updated file
          const sorted = [...storedFiles].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setActiveFileId(sorted[0].id);
          setMarkdown(sorted[0].content || '');
        } else {
          // Legacy migration or fresh start
          const legacyDraft = await localforage.getItem<string>(LEGACY_STORAGE_KEY);

          if (legacyDraft !== null && legacyDraft !== undefined && typeof legacyDraft === 'string' && legacyDraft.trim() !== '') {
            const newFile: StixFile = {
              id: `stix_${Date.now()}`,
              title: 'Legacy Draft',
              content: legacyDraft,
              updatedAt: new Date().toISOString()
            };
            setFiles([newFile]);
            setActiveFileId(newFile.id);
            setMarkdown(newFile.content || '');
            await localforage.setItem(STORAGE_KEY, [newFile]);
          } else {
            // Fresh Workspace Generation
            const manualFile: StixFile = {
              id: `stix_${Date.now()}_manual`,
              title: 'Stix User Manual',
              content: USER_MANUAL_MD,
              updatedAt: new Date().toISOString()
            };

            const initialFiles = [manualFile];
            setFiles(initialFiles);
            setActiveFileId(manualFile.id);
            setMarkdown(manualFile.content || '');
            await localforage.setItem(STORAGE_KEY, initialFiles);
          }
        }
      } catch (error) {
        console.error('Hydration failed', error);
      } finally {
        setIsLoaded(true);
      }
    };
    hydrateState();
  }, []);

  // 3. Debounced Auto-Save Loops
  useEffect(() => {
    if (!isLoaded || !activeFileId) return;

    const timeoutId = setTimeout(() => {
      setFiles(prevFiles => {
        const safePrev = Array.isArray(prevFiles) ? prevFiles : [];
        const updated = safePrev.map(f => {
          if (f.id === activeFileId) {
            return { ...f, content: markdown, updatedAt: new Date().toISOString() };
          }
          return f;
        });
        localforage.setItem(STORAGE_KEY, updated).catch(console.error);
        return updated;
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [markdown, activeFileId, isLoaded]);

  // File Management Handlers
  const handleNewFile = () => {
    if (activeFileId) {
      setFiles(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const updated = safePrev.map(f => f.id === activeFileId ? { ...f, content: markdown, updatedAt: new Date().toISOString() } : f);
        localforage.setItem(STORAGE_KEY, updated);
        return updated;
      });
    }

    const newFile: StixFile = {
      id: `stix_${Date.now()}`,
      title: 'Untitled Document',
      content: '',
      updatedAt: new Date().toISOString()
    };
    setFiles(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const updated = [newFile, ...safePrev];
      localforage.setItem(STORAGE_KEY, updated);
      return updated;
    });
    setActiveFileId(newFile.id);
    setMarkdown(newFile.content || '');
  };

  const handleSwitchFile = (id: string) => {
    if (id === activeFileId) return;

    // Save current active file
    setFiles(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const updated = safePrev.map(f => f.id === activeFileId ? { ...f, content: markdown, updatedAt: new Date().toISOString() } : f);
      localforage.setItem(STORAGE_KEY, updated);
      return updated;
    });

    // Load target file
    const targetFile = (Array.isArray(files) ? files : []).find(f => f.id === id);
    if (targetFile) {
      setActiveFileId(targetFile.id);
      setMarkdown(targetFile.content || '');
    }

    // Auto-close sidebar on mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteFile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    setFiles(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const updated = safePrev.filter(f => f.id !== id);

      if (id === activeFileId) {
        if (updated.length > 0) {
          const sorted = [...updated].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setActiveFileId(sorted[0].id);
          setMarkdown(sorted[0].content || '');
        } else {
          const newFile: StixFile = {
            id: `stix_${Date.now()}`,
            title: 'Untitled Document',
            content: '',
            updatedAt: new Date().toISOString()
          };
          updated.push(newFile);
          setActiveFileId(newFile.id);
          setMarkdown(newFile.content || '');
        }
      }

      localforage.setItem(STORAGE_KEY, updated);
      return updated;
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setFiles(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const updated = safePrev.map(f => f.id === activeFileId ? { ...f, title: newTitle, updatedAt: new Date().toISOString() } : f);
      localforage.setItem(STORAGE_KEY, updated);
      return updated;
    });
  };

  // Compressed Vault Backup & Restore
  const exportCompressedVault = async () => {
    try {
      const storedFiles = await localforage.getItem<StixFile[]>(STORAGE_KEY);
      if (!storedFiles || !Array.isArray(storedFiles) || storedFiles.length === 0) {
        alert("Vault is empty. Nothing to backup.");
        setIsExportModalOpen(false);
        return;
      }

      const filesToExport = storedFiles.filter(f => exportSelection.has(f.id));
      
      if (filesToExport.length === 0) {
        alert("No files selected for export.");
        return;
      }

      const isPartialExport = filesToExport.length < storedFiles.length;

      // Extract binary assets and encode to Base64
      const assets: Record<string, string> = {};
      const assetKeys = await mediaStore.keys();

      for (const key of assetKeys) {
        const blob = await mediaStore.getItem<Blob>(key);
        if (blob) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          assets[key] = base64;
        }
      }

      const archive: any = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        files: filesToExport,
        assets: assets
      };

      if (!isPartialExport) {
        archive.workspaceHistory = await localforage.getItem<WorkspaceHistory>(WS_HISTORY_KEY);
      }

      const json = JSON.stringify(archive);

      const password = window.prompt("Enter a strong password to encrypt this vault:");
      if (!password) {
        alert("Export cancelled. Password is required to encrypt the vault.");
        return;
      }

      // AES-256 Encryption
      const encrypted = CryptoJS.AES.encrypt(json, password).toString();

      // Native Browser Compression
      const encoder = new TextEncoder();
      const uint8array = encoder.encode(encrypted);
      const stream = new Blob([uint8array]).stream() as unknown as ReadableStream;
      // @ts-ignore
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(compressedStream).blob();

      const url = URL.createObjectURL(compressedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stix_workspace_${new Date().toISOString().split('T')[0]}.stix`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (e) {
      console.error('Vault export failed', e);
      alert('Failed to export compressed vault.');
    }
  };

  const importCompressedVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const password = window.prompt("Enter your vault password to decrypt:");
      if (!password) {
        alert("Import cancelled. Password is required.");
        e.target.value = '';
        return;
      }

      // Native Browser Decompression
      const stream = file.stream() as unknown as ReadableStream;
      // @ts-ignore
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      const encryptedText = await new Response(decompressedStream).text();

      let text = '';
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedText, password);
        text = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (!text) throw new Error("Malformed UTF-8");
      } catch (err) {
        alert("Incorrect password or corrupted vault.");
        e.target.value = '';
        return;
      }

      const parsed = JSON.parse(text);

      // Validate Cloudless Vault Schema
      if (parsed.files && Array.isArray(parsed.files) && parsed.assets && typeof parsed.assets === 'object') {
        // 1. Wipe Active Databases
        await mediaStore.clear();

        // 2. Rehydrate Binary Assets
        for (const [key, base64] of Object.entries(parsed.assets)) {
          if (typeof base64 === 'string') {
            const res = await fetch(base64);
            const blob = await res.blob();
            await mediaStore.setItem(key, blob);
          }
        }

        // 3. Rehydrate Primary Documents and Workspace History
        await localforage.setItem(STORAGE_KEY, parsed.files);
        setFiles(parsed.files);
        
        if (parsed.workspaceHistory) {
          await localforage.setItem(WS_HISTORY_KEY, parsed.workspaceHistory);
          setWorkspaceHistory(parsed.workspaceHistory);
        } else {
          const freshHistory = { commits: [], branches: [{ name: 'main', headCommitId: null }], activeBranch: 'main' };
          await localforage.setItem(WS_HISTORY_KEY, freshHistory);
          setWorkspaceHistory(freshHistory as any);
        }

        // 4. Update View State Immediately
        const sorted = [...parsed.files].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        if (sorted.length > 0) {
          setActiveFileId(sorted[0].id);
          setMarkdown(sorted[0].content || '');
        }

        alert("Compressed Vault restored successfully!");
      } else {
        alert("Invalid portable vault file format. Missing .files or .assets payload.");
      }
    } catch (err) {
      console.error('Vault import failed', err);
      alert('Failed to parse portable vault file. Is it a valid .stix backup?');
    }
    e.target.value = '';
  };



  const handleExportMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stix_workspace.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHTML = () => {
    if (!previewRef.current) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Stix Export</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px; }
          h1, h2, h3 { color: #000; }
          code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
          pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
          blockquote { border-left: 4px solid var(--color-primary-fixed, #c3f400); background: #f9f9f9; margin: 0; padding: 16px; color: #333; font-style: normal; }
          img { max-width: 100%; border-radius: 4px; }
        </style>
      </head>
      <body>
        ${previewRef.current.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stix_workspace.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4. Multimedia Drag-and-Drop Handlers
  const insertTextAtCursor = (textToInsert: string) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current.querySelector('textarea');

    if (textarea) {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      setMarkdown(prev => prev.substring(0, startPos) + textToInsert + prev.substring(endPos));
    } else {
      setMarkdown(prev => prev + textToInsert);
    }
  };

  const handleAssetUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const safeName = file.name.replace(/[^a-zA-Z0-9.\\-_]/g, '_');
    const id = `asset_${Date.now()}_${safeName}`;

    try {
      await mediaStore.setItem(id, file);
      const mdTag = `\n![${safeName}](local://${id})\n`;
      insertTextAtCursor(mdTag);
    } catch (e) {
      console.error('Asset save failed', e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAssetUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      handleAssetUpload(e.clipboardData.files[0]);
    }
  };

  const preventDefaults = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Telemetry Calculations
  const telemetry = useMemo(() => {
    const safeMarkdown = markdown || '';
    const charCount = safeMarkdown.length;
    const words = safeMarkdown.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = safeMarkdown.trim() === '' ? 0 : words.length;
    const readTime = Math.ceil(wordCount / 200);
    return { charCount, wordCount, readTime };
  }, [markdown]);

  // Loading Skeleton
  if (!isLoaded) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <nav className="h-14 flex justify-between items-center px-6 border-b border-neutral-800 bg-surface shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-6 w-16 bg-neutral-800 rounded animate-pulse"></div>
            <div className="h-6 w-[1px] bg-neutral-800 mx-2"></div>
            <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse"></div>
          </div>
        </nav>
        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          <div className="flex-1 bg-surface-container-lowest animate-pulse rounded-sm border border-neutral-800"></div>
          <div className="w-px bg-neutral-800 shrink-0"></div>
          <div className="flex-1 bg-surface-container animate-pulse rounded-sm border border-neutral-800"></div>
        </div>
        <footer className="h-8 bg-neutral-950 border-t border-neutral-800 shrink-0"></footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background animate-in fade-in duration-500">
      {/* 1. STICKY TOP HEADER */}
      <nav className="h-auto md:h-14 py-2 md:py-0 flex flex-wrap justify-between items-center px-4 md:px-6 border-b border-neutral-800 bg-surface shrink-0 z-10 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-neutral-500 hover:text-on-surface transition-colors p-1"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSidebarOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}
            </span>
          </button>
          <svg className="h-6 w-6 md:h-7 md:w-7 ml-1 md:ml-2" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" rx="24" fill="#131313" />
            <path d="M60 70L85 95L60 120" stroke="var(--color-primary-fixed)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="95" y="110" width="45" height="12" rx="2" fill="var(--color-primary-fixed)" />
          </svg>
          <span className="hidden md:inline text-headline-md font-headline-md font-bold text-on-surface tracking-tighter">
            <span style={{ color: 'var(--color-primary-fixed)' }}>S</span>tix
          </span>
          <div className="h-6 w-[1px] bg-neutral-800 mx-2 md:mx-3"></div>
          <input
            type="text"
            value={Array.isArray(files) ? files.find(f => f.id === activeFileId)?.title || '' : ''}
            onChange={handleTitleChange}
            className="bg-transparent border-none outline-none font-label-sm text-on-surface-variant uppercase tracking-widest text-[10px] w-32 md:w-64 focus:ring-0 focus:text-on-surface transition-colors"
            placeholder="UNTITLED"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2 md:gap-6">
          
          {/* Mobile View Toggle */}
          <div className="md:hidden flex items-center bg-surface-container rounded-sm border border-neutral-800 overflow-hidden shrink-0">
            <button 
              onClick={() => setMobileViewMode('edit')}
              className={`font-label-sm text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors ${mobileViewMode === 'edit' ? 'bg-neutral-800 text-on-surface' : 'text-neutral-500'}`}
            >
              EDIT
            </button>
            <button 
              onClick={() => setMobileViewMode('preview')}
              className={`font-label-sm text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors ${mobileViewMode === 'preview' ? 'bg-neutral-800 text-on-surface' : 'text-neutral-500'}`}
            >
              PREVIEW
            </button>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Font Switcher */}
            <button
              onClick={() => setFontIdx((prev) => (prev + 1) % FONTS.length)}
              className="font-label-sm text-[10px] uppercase tracking-widest text-secondary border border-neutral-800 hover:text-on-surface px-2 md:px-4 py-1.5 transition-colors whitespace-nowrap"
            >
              <span className="hidden md:inline">FONT: </span>{FONTS[fontIdx].name}
            </button>

            {/* Theme Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="font-label-sm text-[10px] uppercase tracking-widest text-secondary border border-neutral-800 hover:text-on-surface px-2 md:px-4 py-1.5 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary-fixed)' }}></div>
                <span className="hidden md:inline">THEME</span>
              </button>

              {isThemeMenuOpen && (
                <div className="absolute top-full right-0 mt-2 p-2 bg-surface-container border border-neutral-800 rounded-sm shadow-xl flex flex-col gap-1 z-50">
                  {PALETTES.map((p, idx) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        setThemeIdx(idx);
                        setIsThemeMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-highest transition-colors rounded-sm text-left w-36"
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${themeIdx === idx ? 'ring-1 ring-offset-1 ring-offset-surface-container ring-neutral-500' : ''}`}
                        style={{ backgroundColor: p.fixed }}
                      />
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={handleExportMarkdown}
              className="font-label-sm text-[10px] uppercase tracking-widest text-secondary border border-neutral-800 hover:border-primary-fixed hover:text-primary-fixed px-2 md:px-4 py-1.5 transition-colors whitespace-nowrap"
            >
              <span className="hidden md:inline">EXPORT </span>MD
            </button>
            <button
              onClick={handleExportHTML}
              className="font-label-sm text-[10px] uppercase tracking-widest px-2 md:px-4 py-1.5 font-bold hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
              style={{ backgroundColor: 'var(--color-primary-fixed)', color: 'var(--color-on-primary-fixed)' }}
            >
              <span className="hidden md:inline">EXPORT </span>HTML
            </button>
          </div>
        </div>
      </nav>

      {/* 2. MAIN BODY (Split View) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 z-30 transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`bg-neutral-950 border-r border-neutral-800 flex flex-col transition-all duration-300 shrink-0 overflow-hidden absolute md:relative z-40 h-full ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0 border-r-0'}`}
        >
          <div className="p-4 border-b border-neutral-800 flex flex-col gap-2">
            <button
              onClick={handleNewFile}
              className="w-full flex items-center justify-center gap-2 font-label-sm text-[10px] uppercase tracking-widest px-4 py-2 font-bold hover:brightness-110 active:scale-95 transition-all rounded-sm"
              style={{ backgroundColor: 'var(--color-primary-fixed)', color: 'var(--color-on-primary-fixed)' }}
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              NEW FILE
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-center gap-2 font-label-sm text-[10px] uppercase tracking-widest px-4 py-2 text-secondary border border-neutral-800 hover:text-on-surface hover:bg-neutral-800 transition-all rounded-sm"
            >
              <span className="material-symbols-outlined text-[14px]">search</span>
              SEARCH [⌘K]
            </button>
            <button
              onClick={() => setIsVersionControlOpen(true)}
              className="w-full flex items-center justify-center gap-2 font-label-sm text-[10px] uppercase tracking-widest px-4 py-2 text-secondary border border-neutral-800 hover:text-on-surface hover:bg-neutral-800 transition-all rounded-sm"
            >
              <span className="material-symbols-outlined text-[14px]">history</span>
              VERSION HISTORY
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {(Array.isArray(files) ? [...files] : []).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(file => (
              <div
                key={file.id}
                onClick={() => handleSwitchFile(file.id)}
                className={`group cursor-pointer p-3 rounded-sm flex items-center justify-between transition-colors ${file.id === activeFileId ? 'bg-surface-container-highest border-l-2' : 'hover:bg-surface-container border-l-2 border-transparent'}`}
                style={file.id === activeFileId ? { borderLeftColor: 'var(--color-primary-fixed)' } : {}}
              >
                <div className="flex flex-col overflow-hidden pr-2">
                  <span className={`font-label-sm text-[11px] truncate ${file.id === activeFileId ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                    {file.title || 'Untitled Document'}
                  </span>
                  <span className="font-mono text-[9px] text-neutral-600 mt-1">
                    {new Date(file.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDeleteFile(e, file.id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all p-1 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            ))}
          </div>

          {/* Vault Backup/Restore */}
          <div className="p-4 border-t border-neutral-800 flex gap-2 shrink-0 bg-neutral-950">
            <button
              onClick={() => {
                setExportSelection(new Set((Array.isArray(files) ? files : []).map(f => f.id)));
                setIsExportModalOpen(true);
              }}
              className="flex-1 font-label-sm text-[10px] uppercase tracking-widest text-secondary border border-neutral-800 hover:border-primary-fixed hover:text-primary-fixed py-2 transition-colors rounded-sm flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              BACKUP
            </button>
            <label className="flex-1 font-label-sm text-[10px] uppercase tracking-widest text-secondary border border-neutral-800 hover:border-primary-fixed hover:text-primary-fixed py-2 transition-colors rounded-sm flex items-center justify-center gap-1 cursor-pointer">
              <span className="material-symbols-outlined text-[14px]">upload</span>
              RESTORE
              <input type="file" accept=".stix" className="hidden" onChange={importCompressedVault} />
            </label>
          </div>
        </div>

        {/* Editor Pane */}
        <section
          className={`flex-1 flex-col bg-surface-container-lowest overflow-hidden relative ${mobileViewMode === 'edit' ? 'flex' : 'hidden md:flex'}`}
          onDrop={handleDrop}
          onDragOver={preventDefaults}
          onDragEnter={preventDefaults}
          onDragLeave={preventDefaults}
          onPaste={handlePaste}
        >
          <div
            ref={editorRef}
            className="flex-grow overflow-y-auto bg-transparent relative p-10 pb-[50vh]"
          >
            <Editor
              value={markdown}
              onValueChange={(code: string) => setMarkdown(code)}
              highlight={(code: string) => Prism.highlight(code, Prism.languages.markdown, 'markdown')}
              padding={0}
              style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 14,
                minHeight: '100%',
                outline: 'none',
              }}
              className="markdown-editor font-code-md text-code-md text-on-surface w-full leading-relaxed tracking-wide outline-none focus:ring-0"
              textareaClassName="focus:outline-none focus:ring-0 !border-0 !outline-none"
            />
          </div>
        </section>

        {/* Vertical Separator */}
        <div className="hidden md:block w-px bg-neutral-800 shrink-0 z-10"></div>

        {/* Preview Pane */}
        <section className={`flex-1 flex-col bg-surface overflow-hidden relative ${mobileViewMode === 'preview' ? 'flex' : 'hidden md:flex'}`}>
          <div
            ref={previewRef}
            className="flex-grow overflow-y-auto p-10 pb-[50vh] font-preview-body text-preview-body max-w-none"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={(value: string) => value}
              components={{
                h1: ({ node, ...props }) => <h1 className="font-display-lg text-display-lg text-on-surface mb-6 mt-8" {...props} />,
                h2: ({ node, ...props }) => <h2 className="font-headline-md text-headline-md text-on-surface mb-4 mt-6 border-b border-neutral-800 pb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="font-label-sm text-label-sm uppercase mb-3 mt-4" style={{ color: 'var(--color-primary-fixed)' }} {...props} />,
                p: ({ node, ...props }) => <p className="mb-6 leading-relaxed text-on-surface-variant tracking-wide" {...props} />,
                ul: ({ node, ...props }) => <ul className="space-y-3 mb-6 list-disc list-inside text-on-surface-variant" {...props} />,
                ol: ({ node, ...props }) => <ol className="space-y-3 mb-6 list-decimal list-inside text-on-surface-variant" {...props} />,
                li: ({ node, ...props }) => <li className="text-on-surface text-sm" {...props} />,
                hr: ({ node, ...props }) => <hr className="border-neutral-800 my-8" {...props} />,

                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 bg-neutral-900/50 p-6 my-6 text-on-surface-variant not-italic rounded-r-sm"
                    style={{ borderColor: 'var(--color-primary-fixed)' }}
                    {...props}
                  />
                ),

                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && language && Prism.languages[language]) {
                    try {
                      const html = Prism.highlight(codeString, Prism.languages[language], language);
                      return (
                        <div className="p-6 bg-surface-container border border-neutral-800 font-code-md text-code-md mb-6 overflow-x-auto rounded-sm">
                          <code className={className} dangerouslySetInnerHTML={{ __html: html }} />
                        </div>
                      );
                    } catch (e) {
                      console.error('Syntax highlight error', e);
                    }
                  }

                  return !inline ? (
                    <div className="p-6 bg-surface-container border border-neutral-800 font-code-md text-code-md mb-6 overflow-x-auto rounded-sm">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </div>
                  ) : (
                    <code className="bg-surface-container px-1.5 py-0.5 rounded-sm" style={{ color: 'var(--color-primary-fixed-dim)' }} {...props}>
                      {children}
                    </code>
                  );
                },

                // Custom Image Interceptor for local Blobs
                img: ({ node, src, alt, ...props }) => <AsyncImage src={src} alt={alt} {...props} />
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </section>

      </div>

      {/* 4. SYSTEM METRICS FOOTER */}
      <footer className="h-8 bg-neutral-950 border-t border-neutral-800 px-4 flex items-center justify-between text-[11px] text-neutral-500 font-mono shrink-0">
        <div className="hidden md:flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-primary-fixed)' }}></div>
          <span>SYS_STATUS: READY // LOCAL_SYNC: ACTIVE</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 ml-auto">
          <span className="hidden sm:inline">{telemetry.wordCount.toLocaleString()} WORDS</span>
          <span className="hidden sm:inline text-neutral-700">|</span>
          <span>{telemetry.charCount.toLocaleString()} CHARS</span>
          <span className="text-neutral-700">|</span>
          <span style={{ color: 'var(--color-primary-fixed-dim)' }}>~{telemetry.readTime} MIN</span>
        </div>
      </footer>

      {/* SEARCH MODAL OVERLAY */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-2xl bg-surface-container border border-neutral-800 rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200"
          >
            <div className="flex items-center px-4 py-3 border-b border-neutral-800 bg-surface-container-highest">
              <span className="material-symbols-outlined text-neutral-500 mr-3">search</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspace..."
                className="flex-1 bg-transparent border-none outline-none text-on-surface font-code-md text-sm placeholder:text-neutral-600 focus:ring-0"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="text-neutral-500 hover:text-on-surface p-1 rounded-sm"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
              {searchQuery.trim() === '' ? (
                <div className="p-8 text-center text-neutral-600 font-label-sm text-[10px] uppercase tracking-widest">
                  Type to search files and #tags
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-neutral-600 font-label-sm text-[10px] uppercase tracking-widest">
                  No results found
                </div>
              ) : (
                <div className="p-2 flex flex-col gap-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.item.id}
                      onClick={() => {
                        handleSwitchFile(result.item.id);
                        setIsSearchOpen(false);
                      }}
                      className="flex flex-col text-left p-3 hover:bg-neutral-800 rounded-sm transition-colors group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-label-sm text-[12px] text-on-surface group-hover:text-primary-fixed transition-colors">
                          {result.item.title || 'Untitled Document'}
                        </span>
                        <span className="font-mono text-[9px] text-neutral-600">
                          {new Date(result.item.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {result.item.tags && result.item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.item.tags.map((tag: string) => (
                            <span key={tag} className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm bg-neutral-900 text-neutral-400 border border-neutral-800">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Invisible backdrop to close when clicking outside */}
          <div className="fixed inset-0 -z-10" onClick={() => setIsSearchOpen(false)} />
        </div>
      )}

      {/* EXPORT VAULT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface-container border border-neutral-800 rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-surface-container-highest">
              <h2 className="font-headline-md text-on-surface uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary-fixed">encrypted</span>
                Secure Vault Backup
              </h2>
              <button onClick={() => setIsExportModalOpen(false)} className="text-neutral-500 hover:text-on-surface p-1 rounded-sm transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6">
              <p className="font-label-sm text-[11px] text-neutral-400 uppercase tracking-widest mb-4">
                Select files to include in this backup.
              </p>
              
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setExportSelection(new Set(files.map(f => f.id)))}
                  className="px-3 py-1 font-label-sm text-[9px] uppercase tracking-widest border border-neutral-700 text-neutral-400 hover:text-on-surface rounded-sm transition-colors"
                >
                  Select All
                </button>
                <button 
                  onClick={() => setExportSelection(new Set())}
                  className="px-3 py-1 font-label-sm text-[9px] uppercase tracking-widest border border-neutral-700 text-neutral-400 hover:text-on-surface rounded-sm transition-colors"
                >
                  Deselect All
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-neutral-800 rounded-sm bg-surface-container-lowest p-2 flex flex-col gap-1">
                {files.map(file => (
                  <label key={file.id} className="flex items-center gap-3 p-2 hover:bg-surface-container rounded-sm cursor-pointer transition-colors group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={exportSelection.has(file.id)}
                        onChange={(e) => {
                          const newSet = new Set(exportSelection);
                          if (e.target.checked) newSet.add(file.id);
                          else newSet.delete(file.id);
                          setExportSelection(newSet);
                        }}
                        className="peer appearance-none w-4 h-4 border border-neutral-600 rounded-sm checked:bg-primary-fixed checked:border-primary-fixed transition-colors cursor-pointer"
                      />
                      <span className="material-symbols-outlined absolute text-[12px] text-on-primary-fixed pointer-events-none opacity-0 peer-checked:opacity-100 left-[2px] top-[2px]">
                        check
                      </span>
                    </div>
                    <span className={`font-code-md text-sm truncate ${exportSelection.has(file.id) ? 'text-on-surface' : 'text-neutral-500'}`}>
                      {file.title || 'Untitled Document'}
                    </span>
                  </label>
                ))}
              </div>

              {exportSelection.size < files.length && (
                <div className="mt-4 p-3 bg-red-400/10 border border-red-400/20 rounded-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-[16px] text-red-400 shrink-0 mt-0.5">warning</span>
                  <p className="font-mono text-[10px] text-red-400/90 leading-relaxed">
                    Partial export detected. The global Workspace Version History will be omitted from this backup to ensure privacy of excluded files.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-800 bg-surface-container-lowest">
              <button
                onClick={exportCompressedVault}
                disabled={exportSelection.size === 0}
                className="w-full py-3 rounded-sm font-label-sm text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:pointer-events-none hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--color-primary-fixed)', color: 'var(--color-on-primary-fixed)' }}
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Encrypt & Download Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERSION CONTROL MODAL */}
      {isVersionControlOpen && activeFileId && (
        <VersionControl
          activeFile={(Array.isArray(files) ? files : []).find(f => f.id === activeFileId)!}
          currentMarkdown={markdown}
          onUpdateFile={(updatedFile) => {
            setFiles(prev => {
              const safePrev = Array.isArray(prev) ? prev : [];
              const updated = safePrev.map(f => f.id === updatedFile.id ? updatedFile : f);
              localforage.setItem(STORAGE_KEY, updated);
              return updated;
            });
          }}
          onUpdateMarkdown={setMarkdown}
          
          files={files}
          workspaceHistory={workspaceHistory}
          onUpdateWorkspace={(updatedFiles, updatedHistory) => {
             setFiles(updatedFiles);
             localforage.setItem(STORAGE_KEY, updatedFiles);
             setWorkspaceHistory(updatedHistory);
             localforage.setItem(WS_HISTORY_KEY, updatedHistory);
             
             // If active file was restored to a different state, update markdown
             const currentActive = updatedFiles.find(f => f.id === activeFileId);
             if (currentActive) setMarkdown(currentActive.content);
          }}
          
          onClose={() => setIsVersionControlOpen(false)}
        />
      )}
    </div>
  );
}
