// Admin shell — sidebar, header, dashboard, users table, analytics view

const ADMIN_NAV = [
  { key: "dashboard", label: "Dashboard" },
  { key: "users",     label: "Users" },
  { key: "polls",     label: "Polls" },
  { key: "analytics", label: "Analytics" },
  { key: "system",    label: "System" },
];

function AdminSidebar({ active, onNav, user, onSignOut }) {
  return (
    <aside className="admin-sidebar">
      <div style={{
        height: 64, display: "flex", alignItems: "center", gap: 10,
        padding: "0 24px", borderBottom: "1px solid var(--gray-700)",
      }}>
        <img src="logo-mark.svg" width={24} height={24} alt="" />
        <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.015em" }}>Polls</span>
        <span style={{
          background: "var(--indigo-600)", color: "#fff", borderRadius: 4,
          padding: "2px 8px", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
        }}>ADMIN</span>
      </div>

      <nav style={{ flex: 1, padding: "16px 12px" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {ADMIN_NAV.map((item) => {
            const isActive = item.key === active;
            return (
              <li key={item.key}>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onNav?.(item.key); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                    transition: "background-color 200ms ease, color 200ms ease",
                    textDecoration: "none",
                    background: isActive ? "var(--indigo-600)" : "transparent",
                    color: isActive ? "#fff" : "var(--gray-300)",
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--gray-800)"; e.currentTarget.style.color = "#fff"; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gray-300)"; } }}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ borderTop: "1px solid var(--gray-700)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Avatar name={user?.name} size="sm" variant="dark" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--gray-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={{
            width: "100%", textAlign: "left", borderRadius: 8, padding: "8px 12px",
            background: "transparent", border: 0, color: "var(--gray-400)", fontSize: 14, cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--gray-800)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gray-400)"; }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function AdminHeader({ title, subtitle, action }) {
  return (
    <div className="admin-header">
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--gray-900)" }}>{title}</h1>
        {subtitle && <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--gray-500)" }}>{subtitle}</p>}
      </div>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

function AdminShell({ active, onNav, user, onSignOut, title, subtitle, action, children }) {
  return (
    <div className="admin-shell">
      <AdminSidebar active={active} onNav={onNav} user={user} onSignOut={onSignOut} />
      <div className="admin-content">
        <AdminHeader title={title} subtitle={subtitle} action={action} />
        <div style={{ padding: 24, flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function AdminDashboard({ stats, recentPolls }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <StatCard
          title="Total Users" value={stats.users.toLocaleString()} icon="users" tone="indigo"
          description="vs last week"
          trend={{ value: "12.4%", positive: true }}
          sparkline={[42, 48, 51, 49, 58, 62, 68, 71, 79, 82, 88, 96]}
        />
        <StatCard
          title="Total Polls" value={stats.polls.toLocaleString()} icon="polls" tone="blue"
          description="vs last week"
          trend={{ value: "8.1%", positive: true }}
          sparkline={[12, 15, 18, 17, 22, 26, 28, 33, 31, 37, 42, 48]}
        />
        <StatCard
          title="Active Polls" value={stats.active.toLocaleString()} icon="check" tone="green"
          description="accepting responses"
          trend={{ value: "3.2%", positive: false }}
          sparkline={[88, 92, 95, 97, 94, 96, 91, 89, 92, 90, 88, 84]}
        />
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, color: "var(--gray-900)" }}>Recent Polls</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th><th>Owner</th><th>Visibility</th><th>Responses</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPolls.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--gray-900)" }}>{p.title}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>{p.slug}</p>
                  </td>
                  <td>{p.owner}</td>
                  <td><Badge variant={p.visibility === "PUBLIC" ? "success" : "default"}>{p.visibility}</Badge></td>
                  <td>{p.responseCount}</td>
                  <td><Badge variant={p.isActive ? "success" : "danger"}>{p.isActive ? "Active" : "Inactive"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AdminUsersTable({ users }) {
  const [sel, setSel] = React.useState([]);
  const allIds = users.map((u) => u.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => sel.includes(id));
  const toggleAll = () => setSel(allSelected ? [] : allIds);
  const toggleOne = (id) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <p className="text-sm text-gray-500" style={{ margin: 0 }}>
          {sel.length > 0 ? `${sel.length} selected` : `${users.length} users`}
        </p>
        <Button variant="secondary" size="sm">Export CSV</Button>
      </div>

      {sel.length > 0 && (
        <div className="card card-sm" style={{
          marginBottom: 12, background: "var(--indigo-50)", border: "1px solid var(--indigo-100)",
          padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span className="text-sm" style={{ color: "var(--indigo-700)", fontWeight: 500 }}>
            {sel.length} {sel.length === 1 ? "user" : "users"} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSel([])}>Clear</Button>
            <Button variant="danger" size="sm">Delete selected</Button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: "var(--indigo-600)" }} />
              </th>
              <th>User</th><th>Role</th><th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSel = sel.includes(u.id);
              return (
                <tr key={u.id} className={isSel ? "is-selected" : ""}>
                  <td>
                    <input type="checkbox" checked={isSel} onChange={() => toggleOne(u.id)} style={{ accentColor: "var(--indigo-600)" }} />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--gray-900)" }}>{u.name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><Badge variant={u.role === "ADMIN" ? "info" : "default"}>{u.role}</Badge></td>
                  <td>{u.joined}</td>
                  <td>
                    <select className="select" defaultValue={u.role} style={{ width: 110, padding: "6px 10px", fontSize: 14 }}>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* Analytics — total + per-question breakdowns */
function AnalyticsView({ totalResponses, questions }) {
  return (
    <>
      <div className="card card-md">
        <p className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Total responses</p>
        <p style={{ margin: "4px 0 0", fontSize: 36, fontWeight: 700, color: "var(--gray-900)", lineHeight: 1 }}>{totalResponses}</p>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "var(--gray-900)" }}>Question breakdown</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {questions.map((q) => (
            <QuestionAnalyticsCard key={q.id} q={q} />
          ))}
        </div>
      </div>
    </>
  );
}

function QuestionAnalyticsCard({ q }) {
  return (
    <div className="card card-sm">
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--gray-900)" }}>{q.text}</h3>
        <Badge variant="default">{q.total} {q.total === 1 ? "answer" : "answers"}</Badge>
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {q.options.map((opt) => (
          <div key={opt.id}>
            <div className="flex" style={{ justifyContent: "space-between", fontSize: 12, color: "var(--gray-700)", marginBottom: 4 }}>
              <span>{opt.text}</span>
              <span style={{ fontWeight: 500 }}>{opt.count} ({opt.pct.toFixed(1)}%)</span>
            </div>
            <div style={{ height: 8, background: "var(--gray-100)", borderRadius: 9999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(opt.pct, 100)}%`, background: "var(--indigo-500)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  AdminSidebar, AdminHeader, AdminShell, AdminDashboard,
  AdminUsersTable, AnalyticsView, QuestionAnalyticsCard,
});
