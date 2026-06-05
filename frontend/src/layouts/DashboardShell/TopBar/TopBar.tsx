import { Breadcrumbs } from '../../../components/primitives/Breadcrumbs';
import { useTopBarMeta } from './hooks/useTopBarMeta';
import { TopBarActions } from './TopBarActions';

export function TopBar() {
  const { subtitle, showNewPollButton, breadcrumbs } = useTopBarMeta();

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
      <TopBarActions showNewPollButton={showNewPollButton} />
    </header>
  );
}
