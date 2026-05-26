// Poll-taking and Poll dashboard components

function QuestionRenderer({ question, value, onChange, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--gray-900)" }}>
        {question.text}
        {question.isRequired && <span style={{ marginLeft: 4, color: "var(--red-600)" }}>*</span>}
      </p>

      {question.type === "SINGLE_CHOICE" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {question.options.map((o) => (
            <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === o.id}
                onChange={() => onChange(o.id)}
                style={{ accentColor: "var(--indigo-600)", width: 16, height: 16 }}
              />
              <span className="text-sm text-gray-700">{o.text}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "MULTIPLE_CHOICE" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {question.options.map((o) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(o.id);
            return (
              <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? arr.filter((v) => v !== o.id) : [...arr, o.id])}
                  style={{ accentColor: "var(--indigo-600)", width: 16, height: 16 }}
                />
                <span className="text-sm text-gray-700">{o.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === "TEXT" && (
        <textarea
          className="textarea"
          rows={3}
          placeholder="Your answer…"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

/* Public poll-taking screen — /:slug */
function PollScreen({ poll, onSubmit, submitted, isSubmitting }) {
  const [values, setValues] = React.useState({});
  if (submitted) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card card-lg" style={{ width: "100%", maxWidth: 512, textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>🎉</div>
          <h1 style={{ margin: "16px 0 0", fontSize: 20, fontWeight: 600, color: "var(--gray-900)" }}>Thank you!</h1>
          <p className="text-sm text-gray-600" style={{ margin: "8px 0 0" }}>Your response has been recorded successfully.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <div style={{ maxWidth: 512, margin: "0 auto" }}>
        <div className="card card-md">
          <h1 className="text-2xl font-bold text-gray-900" style={{ margin: 0 }}>{poll.title}</h1>
          {poll.description && (
            <p className="text-sm text-gray-600" style={{ margin: "8px 0 0" }}>{poll.description}</p>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); onSubmit?.(values); }}
            style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 24 }}
          >
            {poll.questions.map((q) => (
              <QuestionRenderer
                key={q.id}
                question={q}
                value={values[q.id] ?? (q.type === "MULTIPLE_CHOICE" ? [] : "")}
                onChange={(v) => setValues((p) => ({ ...p, [q.id]: v }))}
              />
            ))}
            <Button type="submit" isLoading={isSubmitting} style={{ width: "100%" }}>
              {isSubmitting ? "Submitting…" : "Submit response"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* Dashboard list item — one poll row */
function PollListItem({ poll, onEdit, onDelete, onToggleActive, onCopyLink, onAnalytics }) {
  return (
    <div className="card card-sm">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--gray-900)" }}>{poll.title}</h3>
            <Badge variant={poll.visibility === "PUBLIC" ? "success" : "default"}>{poll.visibility}</Badge>
            <Badge variant={poll.isActive ? "info" : "danger"}>{poll.isActive ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="text-xs text-gray-500" style={{ margin: "6px 0 0" }}>
            /{poll.slug} · {poll.responseCount} response{poll.responseCount !== 1 ? "s" : ""}
            {poll.expiresAt && <> · Expires {poll.expiresAt}</>}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button className="btn btn-row" onClick={() => onToggleActive?.(poll)}>
            {poll.isActive ? "Deactivate" : "Activate"}
          </button>
          <button className="btn btn-row" onClick={() => onCopyLink?.(poll)}>Copy link</button>
          <button className="btn btn-row" onClick={() => onAnalytics?.(poll)}>Analytics</button>
          <button className="btn btn-soft-primary" onClick={() => onEdit?.(poll)}>Edit</button>
          <button className="btn btn-soft-danger" onClick={() => onDelete?.(poll)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function DashboardScreen({ user, polls, onCreate, onAnalytics, onDelete, onEdit, onToggleActive, onCopyLink, onAdmin }) {
  return (
    <div className="page" style={{ padding: "32px 16px" }}>
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <div className="flex" style={{ flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ margin: 0 }}>Dashboard</h1>
            <p className="text-sm text-gray-600" style={{ margin: "4px 0 0" }}>Welcome back, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            {user?.role === "ADMIN" && (
              <Button variant="secondary" onClick={onAdmin}>Admin Panel</Button>
            )}
            <Button onClick={onCreate}>Create Poll</Button>
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          {polls.length === 0 ? (
            <div className="card card-lg" style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 36 }}>📋</div>
              <h2 style={{ margin: "16px 0 0", fontSize: 18, fontWeight: 600, color: "var(--gray-900)" }}>No polls yet</h2>
              <p className="text-sm text-gray-500" style={{ margin: "8px 0 0" }}>Create your first poll to start collecting responses.</p>
              <Button onClick={onCreate} style={{ marginTop: 16 }}>Create Poll</Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {polls.map((p) => (
                <PollListItem
                  key={p.id}
                  poll={p}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleActive={onToggleActive}
                  onCopyLink={onCopyLink}
                  onAnalytics={onAnalytics}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel = "Delete", danger = true, onCancel, onConfirm, isPending }) {
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 384 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--gray-900)" }}>{title}</h2>
        <p className="text-sm text-gray-600" style={{ margin: "8px 0 0" }}>{body}</p>
        <div className="flex" style={{ marginTop: 16, justifyContent: "flex-end", gap: 12 }}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} isLoading={isPending}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { QuestionRenderer, PollScreen, PollListItem, DashboardScreen, ConfirmDialog });
