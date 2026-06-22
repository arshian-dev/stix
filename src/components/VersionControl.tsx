import { useState } from 'react';
import * as diff from 'diff';
import type { StixFile, StixCommit, StixBranch, WorkspaceHistory, WorkspaceCommit, WorkspaceBranch } from '../pages/Workspace';

interface VersionControlProps {
  activeFile: StixFile;
  currentMarkdown: string;
  onUpdateFile: (updatedFile: StixFile) => void;
  onUpdateMarkdown: (newMarkdown: string) => void;
  
  files: StixFile[];
  workspaceHistory: WorkspaceHistory;
  onUpdateWorkspace: (updatedFiles: StixFile[], updatedHistory: WorkspaceHistory) => void;
  
  onClose: () => void;
}

export function VersionControl({ 
  activeFile, 
  currentMarkdown, 
  onUpdateFile, 
  onUpdateMarkdown, 
  files,
  workspaceHistory,
  onUpdateWorkspace,
  onClose 
}: VersionControlProps) {
  const [activeTab, setActiveTab] = useState<'COMMIT' | 'HISTORY' | 'BRANCHES'>('COMMIT');
  const [scope, setScope] = useState<'FILE' | 'WORKSPACE'>('FILE');
  
  // --- FILE LEVEL NORMALIZATION ---
  const fileBranches = activeFile.branches || [{ name: 'main', headCommitId: null }];
  const fileActiveBranchName = activeFile.activeBranch || 'main';
  const fileCommits = activeFile.commits || [];
  const fileCurrentBranch = fileBranches.find(b => b.name === fileActiveBranchName) || fileBranches[0];

  // --- WORKSPACE LEVEL NORMALIZATION ---
  const wsBranches = workspaceHistory.branches || [{ name: 'main', headCommitId: null }];
  const wsActiveBranchName = workspaceHistory.activeBranch || 'main';
  const wsCommits = workspaceHistory.commits || [];
  const wsCurrentBranch = wsBranches.find(b => b.name === wsActiveBranchName) || wsBranches[0];
  
  // Shared State
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [viewingDiffFor, setViewingDiffFor] = useState<string | null>(null);

  // Computed Active State
  const activeBranchName = scope === 'FILE' ? fileActiveBranchName : wsActiveBranchName;
  const activeBranches = scope === 'FILE' ? fileBranches : wsBranches;
  const activeCommits = scope === 'FILE' ? fileCommits : wsCommits;
  const currentBranch = scope === 'FILE' ? fileCurrentBranch : wsCurrentBranch;

  // --- ACTIONS ---

  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    
    if (scope === 'FILE') {
      const newCommit: StixCommit = {
        id: `commit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        message: commitMessage.trim(),
        content: currentMarkdown,
        parentId: fileCurrentBranch.headCommitId
      };

      const updatedCommits = [newCommit, ...fileCommits];
      const updatedBranches = fileBranches.map(b => 
        b.name === fileActiveBranchName ? { ...b, headCommitId: newCommit.id } : b
      );

      onUpdateFile({
        ...activeFile,
        content: currentMarkdown,
        updatedAt: new Date().toISOString(),
        commits: updatedCommits,
        branches: updatedBranches,
        activeBranch: fileActiveBranchName
      });
    } else {
      // Workspace Scope
      // Capture current working tree, ensuring the active file has the latest markdown
      const currentWorkspaceSnapshot = files.map(f => f.id === activeFile.id ? { ...f, content: currentMarkdown } : f);
      
      const newCommit: WorkspaceCommit = {
        id: `ws_commit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        message: commitMessage.trim(),
        snapshot: currentWorkspaceSnapshot,
        parentId: wsCurrentBranch.headCommitId
      };
      
      const updatedCommits = [newCommit, ...wsCommits];
      const updatedBranches = wsBranches.map(b => 
        b.name === wsActiveBranchName ? { ...b, headCommitId: newCommit.id } : b
      );

      onUpdateWorkspace(currentWorkspaceSnapshot, {
        ...workspaceHistory,
        commits: updatedCommits,
        branches: updatedBranches,
      });
    }

    setCommitMessage('');
    setActiveTab('HISTORY');
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim() || activeBranches.some(b => b.name === newBranchName.trim())) return;
    
    if (scope === 'FILE') {
      const newBranch: StixBranch = {
        name: newBranchName.trim(),
        headCommitId: fileCurrentBranch.headCommitId
      };
      onUpdateFile({
        ...activeFile,
        branches: [...fileBranches, newBranch],
        activeBranch: newBranch.name
      });
    } else {
      const newBranch: WorkspaceBranch = {
        name: newBranchName.trim(),
        headCommitId: wsCurrentBranch.headCommitId
      };
      onUpdateWorkspace(files, {
        ...workspaceHistory,
        branches: [...wsBranches, newBranch],
        activeBranch: newBranch.name
      });
    }
    
    setNewBranchName('');
  };

  const handleCheckoutBranch = (branchName: string) => {
    if (branchName === activeBranchName) return;

    if (scope === 'FILE') {
      const targetBranch = fileBranches.find(b => b.name === branchName);
      if (!targetBranch) return;

      let checkoutContent = '';
      if (targetBranch.headCommitId) {
        const targetCommit = fileCommits.find(c => c.id === targetBranch.headCommitId);
        if (targetCommit) checkoutContent = targetCommit.content;
      }

      onUpdateMarkdown(checkoutContent);
      onUpdateFile({
        ...activeFile,
        content: checkoutContent,
        activeBranch: branchName
      });
    } else {
      const targetBranch = wsBranches.find(b => b.name === branchName);
      if (!targetBranch) return;

      let checkoutSnapshot = files;
      if (targetBranch.headCommitId) {
        const targetCommit = wsCommits.find(c => c.id === targetBranch.headCommitId);
        if (targetCommit) checkoutSnapshot = targetCommit.snapshot;
      }

      onUpdateWorkspace(checkoutSnapshot, {
        ...workspaceHistory,
        activeBranch: branchName
      });
    }
  };

  const handleRestore = (commitId: string) => {
    if (scope === 'FILE') {
      const targetCommit = fileCommits.find(c => c.id === commitId);
      if (!targetCommit) return;

      if (confirm(`Are you sure you want to restore "${activeFile.title}" to "${targetCommit.message}"?`)) {
        onUpdateMarkdown(targetCommit.content);
        onUpdateFile({
          ...activeFile,
          content: targetCommit.content
        });
        onClose();
      }
    } else {
      const targetCommit = wsCommits.find(c => c.id === commitId);
      if (!targetCommit) return;

      if (confirm(`Are you sure you want to restore the ENTIRE WORKSPACE to "${targetCommit.message}"?`)) {
        onUpdateWorkspace(targetCommit.snapshot, workspaceHistory);
        onClose();
      }
    }
  };

  const getBranchHistory = () => {
    const branchCommits: any[] = [];
    let currentId = currentBranch.headCommitId;
    
    while (currentId) {
      const commit = activeCommits.find(c => c.id === currentId);
      if (commit) {
        branchCommits.push(commit);
        currentId = commit.parentId;
      } else {
        break;
      }
    }
    return branchCommits;
  };

  const generateWorkspaceText = (snapshot: StixFile[]) => {
    return snapshot.slice().sort((a,b) => a.title.localeCompare(b.title))
      .map(f => `--- ${f.title} ---\n${f.content}`)
      .join('\n\n');
  };

  const renderDiff = (commit: any) => {
    const parentCommit = commit.parentId ? activeCommits.find(c => c.id === commit.parentId) : null;
    
    let oldStr = '';
    let newStr = '';

    if (scope === 'FILE') {
      oldStr = parentCommit ? (parentCommit as any).content : '';
      newStr = commit.content;
    } else {
      oldStr = parentCommit ? generateWorkspaceText((parentCommit as any).snapshot) : '';
      newStr = generateWorkspaceText(commit.snapshot);
    }
    
    const diffs = diff.diffLines(oldStr, newStr);

    return (
      <div className="bg-neutral-950 p-4 rounded-sm border border-neutral-800 font-mono text-[11px] overflow-x-auto whitespace-pre mt-2">
        {diffs.map((part, idx) => {
          const colorClass = part.added ? 'text-green-400 bg-green-400/10' : part.removed ? 'text-red-400 bg-red-400/10' : 'text-neutral-500';
          const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
          const text = part.value.replace(/\n$/, '');
          return text.split('\n').map((line, lIdx) => (
            <div key={`${idx}-${lIdx}`} className={`px-2 py-0.5 ${colorClass}`}>
              {prefix}{line}
            </div>
          ));
        })}
      </div>
    );
  };

  const branchHistory = getBranchHistory();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl h-[85vh] flex flex-col bg-surface-container border border-neutral-800 rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-surface-container-highest shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--color-primary-fixed)' }}>account_tree</span>
            <div className="flex flex-col">
              <h2 className="font-headline-md text-on-surface uppercase tracking-widest text-sm flex items-center gap-2">
                Version Control
                <span className="px-2 py-0.5 rounded-sm bg-neutral-800 text-neutral-400 font-mono text-[10px] ml-2 tracking-widest border border-neutral-700">
                  {scope === 'FILE' ? `FILE: "${activeFile.title || 'Untitled'}"` : 'ENTIRE WORKSPACE'}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            
            {/* Scope Toggle */}
            <div className="flex bg-neutral-900 border border-neutral-800 rounded-sm overflow-hidden p-0.5">
              <button 
                onClick={() => { setScope('FILE'); setActiveTab('COMMIT'); setViewingDiffFor(null); }}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest transition-colors rounded-sm ${scope === 'FILE' ? 'bg-primary-fixed text-on-primary-fixed' : 'text-neutral-500 hover:text-on-surface'}`}
              >
                📄 File
              </button>
              <button 
                onClick={() => { setScope('WORKSPACE'); setActiveTab('COMMIT'); setViewingDiffFor(null); }}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest transition-colors rounded-sm ${scope === 'WORKSPACE' ? 'bg-primary-fixed text-on-primary-fixed' : 'text-neutral-500 hover:text-on-surface'}`}
              >
                📚 Workspace
              </button>
            </div>

            <button onClick={onClose} className="text-neutral-500 hover:text-on-surface p-1 rounded-sm transition-colors border border-transparent hover:border-neutral-700">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 shrink-0 bg-surface-container-lowest">
          {['COMMIT', 'HISTORY', 'BRANCHES'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 font-label-sm text-[11px] uppercase tracking-widest transition-colors ${activeTab === tab ? 'text-on-surface border-b-2 bg-surface-container' : 'text-neutral-500 hover:text-on-surface hover:bg-neutral-900/50 border-b-2 border-transparent'}`}
              style={activeTab === tab ? { borderColor: 'var(--color-primary-fixed)' } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface">
          
          {activeTab === 'COMMIT' && (
            <div className="flex flex-col gap-6 max-w-xl mx-auto mt-8">
              <div className="bg-surface-container-highest p-4 border border-neutral-800 rounded-sm mb-4">
                <p className="text-on-surface-variant font-code-md text-sm text-center">
                  You are snapshotting the {scope === 'FILE' ? <strong className="text-primary-fixed">Current File</strong> : <strong className="text-primary-fixed">Entire Workspace</strong>} onto branch <strong className="font-mono bg-neutral-950 px-1">{activeBranchName}</strong>.
                </p>
              </div>

              <div>
                <label className="block font-label-sm text-[10px] text-primary-fixed uppercase tracking-widest mb-2">Commit Message</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  placeholder="e.g. Added introduction paragraph..."
                  className="w-full bg-surface-container-highest border border-neutral-800 rounded-sm px-4 py-3 text-on-surface font-code-md text-sm outline-none focus:border-primary-fixed transition-colors"
                  autoFocus
                />
              </div>
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim()}
                className="w-full py-3 rounded-sm font-label-sm text-[11px] font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                style={{ backgroundColor: 'var(--color-primary-fixed)', color: 'var(--color-on-primary-fixed)' }}
              >
                Snapshot State
              </button>
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="flex flex-col gap-4">
              {branchHistory.length === 0 ? (
                <div className="text-center text-neutral-600 font-label-sm text-[11px] uppercase tracking-widest mt-10">
                  No history found for branch '{activeBranchName}'
                </div>
              ) : (
                branchHistory.map((commit, idx) => (
                  <div key={commit.id} className="flex flex-col border border-neutral-800 rounded-sm bg-surface-container overflow-hidden">
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-on-surface font-code-md text-sm">{commit.message}</span>
                        <div className="flex items-center gap-3 text-neutral-500 font-mono text-[10px]">
                          <span>{new Date(commit.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>{commit.id.substring(commit.id.lastIndexOf('_') + 1, commit.id.lastIndexOf('_') + 9)}</span>
                          {idx === 0 && <span className="text-primary-fixed bg-primary-fixed/10 px-1.5 rounded-sm border border-primary-fixed/20">HEAD</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setViewingDiffFor(viewingDiffFor === commit.id ? null : commit.id)}
                          className="px-3 py-1.5 font-label-sm text-[9px] uppercase tracking-widest border border-neutral-700 text-neutral-400 hover:text-on-surface hover:border-neutral-500 rounded-sm transition-colors"
                        >
                          {viewingDiffFor === commit.id ? 'Hide Diff' : 'View Diff'}
                        </button>
                        <button
                          onClick={() => handleRestore(commit.id)}
                          className="px-3 py-1.5 font-label-sm text-[9px] uppercase tracking-widest bg-neutral-800 text-on-surface hover:brightness-110 rounded-sm transition-colors border border-neutral-700"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                    
                    {viewingDiffFor === commit.id && (
                      <div className="border-t border-neutral-800 p-4 bg-surface-container-lowest">
                        {renderDiff(commit)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'BRANCHES' && (
            <div className="flex flex-col gap-8 max-w-xl mx-auto mt-4">
              
              <div className="bg-surface-container-highest p-4 border border-neutral-800 rounded-sm">
                <p className="text-on-surface-variant font-code-md text-sm text-center">
                  Managing branches for the {scope === 'FILE' ? <strong className="text-primary-fixed">Current File</strong> : <strong className="text-primary-fixed">Entire Workspace</strong>}.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <label className="block font-label-sm text-[10px] text-primary-fixed uppercase tracking-widest">Create New Branch</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                    placeholder="e.g. rewrite-draft"
                    className="flex-1 bg-surface-container-highest border border-neutral-800 rounded-sm px-4 py-2 text-on-surface font-code-md text-sm outline-none focus:border-primary-fixed transition-colors"
                  />
                  <button
                    onClick={handleCreateBranch}
                    disabled={!newBranchName.trim()}
                    className="px-6 rounded-sm font-label-sm text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary-fixed)', color: 'var(--color-on-primary-fixed)' }}
                  >
                    Create
                  </button>
                </div>
              </div>

              <div className="h-px bg-neutral-800 w-full"></div>

              <div className="flex flex-col gap-2">
                <label className="block font-label-sm text-[10px] text-neutral-500 uppercase tracking-widest mb-2">Available Branches</label>
                {activeBranches.map(branch => (
                  <div key={branch.name} className={`flex items-center justify-between p-4 rounded-sm border ${branch.name === activeBranchName ? 'border-primary-fixed bg-primary-fixed/5' : 'border-neutral-800 bg-surface-container'}`}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[16px]" style={{ color: branch.name === activeBranchName ? 'var(--color-primary-fixed)' : '#666' }}>
                        account_tree
                      </span>
                      <span className={`font-code-md text-sm ${branch.name === activeBranchName ? 'text-on-surface font-bold' : 'text-neutral-400'}`}>
                        {branch.name}
                      </span>
                      {branch.name === activeBranchName && (
                        <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-sm bg-primary-fixed text-on-primary-fixed ml-2">ACTIVE</span>
                      )}
                    </div>
                    
                    {branch.name !== activeBranchName && (
                      <button
                        onClick={() => handleCheckoutBranch(branch.name)}
                        className="px-4 py-1.5 font-label-sm text-[9px] uppercase tracking-widest border border-neutral-700 text-neutral-400 hover:text-on-surface hover:border-neutral-500 rounded-sm transition-colors"
                      >
                        Checkout
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
