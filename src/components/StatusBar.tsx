export function StatusBar() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-6 bg-surface-container-highest border-t border-outline-variant flex items-center justify-between px-4 z-50 pointer-events-none">
      <div className="flex items-center gap-4">
        <span className="font-label-sm text-[10px] text-on-secondary-container">BRANCH: main*</span>
        <span className="font-label-sm text-[10px] text-on-secondary-container">UTF-8</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-label-sm text-[10px] text-on-secondary-container">1 PROJECT ACTIVE</span>
        <span className="font-label-sm text-[10px] text-primary-fixed">READY</span>
      </div>
    </footer>
  );
}
