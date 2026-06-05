export function AppearanceSection() {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Appearance</h3>
      <p className="mt-1 text-sm text-gray-500">Change how Polls looks on this device.</p>
      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {(['Light', 'Dark', 'System'] as const).map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400 italic">Theme switching — coming soon.</p>
    </div>
  );
}
