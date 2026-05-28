export function EmailNotificationsSection() {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Email notifications</h3>
      <p className="mt-1 text-sm text-gray-500">Choose which emails you want to receive from Polls.</p>
      <ul className="mt-4 flex flex-col gap-3">
        <li className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">New responses</p>
            <p className="text-xs text-gray-500">Get an email whenever someone submits a response to one of your polls.</p>
          </div>
          <input type="checkbox" disabled className="accent-indigo-600 mt-1" aria-label="New responses (coming soon)" />
        </li>
        <li className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Weekly summary</p>
            <p className="text-xs text-gray-500">A weekly digest of activity across your polls every Monday.</p>
          </div>
          <input type="checkbox" disabled className="accent-indigo-600 mt-1" aria-label="Weekly summary (coming soon)" />
        </li>
        <li className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Product updates</p>
            <p className="text-xs text-gray-500">Occasional news about new features and tips.</p>
          </div>
          <input type="checkbox" disabled className="accent-indigo-600 mt-1" aria-label="Product updates (coming soon)" />
        </li>
      </ul>
      <p className="mt-4 text-xs text-gray-400 italic">Email notifications — coming soon.</p>
    </div>
  );
}
