import { useTopBarMeta } from './hooks/useTopBarMeta';
import { TopBarActions } from './TopBarActions';

export function TopBar() {
  const { title, subtitle, showNewPollButton } = useTopBarMeta();

  return (
    <header className="sticky top-0 z-10 h-16 bg-white border-b border-gray-200 px-8 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
      <TopBarActions showNewPollButton={showNewPollButton} />
    </header>
  );
}
