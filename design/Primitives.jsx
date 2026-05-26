// Primitives — Button, Badge, Spinner, Input, Avatar
// Mirrors components/ui/* from andreevqt/polls.

function Spinner({ size = "md", className = "" }) {
  return <span className={`spinner spinner-${size} ${className}`} role="status" aria-label="Loading" />;
}

function Button({
  children, variant = "primary", size = "md", isLoading = false,
  disabled, className = "", ...props
}) {
  const sizeCls = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  return (
    <button
      disabled={disabled || isLoading}
      className={`btn btn-${variant} ${sizeCls} ${className}`}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

function Badge({ children, variant = "default", className = "" }) {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>;
}

function Avatar({ name, size = "md", variant = "light" }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className={`avatar avatar-${size} ${variant === "dark" ? "avatar-dark" : ""}`}>
      {initial}
    </div>
  );
}

function Input({ label, error, id, ...props }) {
  const inputId = id || `i-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <div>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <input id={inputId} className="input" {...props} />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

/* Heroicons paths used inside StatCard wells */
const STAT_ICONS = {
  users: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />,
  polls: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.4 48.4 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  chart: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />,
};

const TONE_BG = {
  indigo: "var(--indigo-50)",  green: "#dcfce7",  blue: "#dbeafe",  amber: "#fef3c7",
};
const TONE_FG = {
  indigo: "var(--indigo-600)", green: "#16a34a",  blue: "#2563eb",  amber: "#b45309",
};

/* Compact area sparkline. Renders an indigo curve + soft fill. */
function Sparkline({ data, color = "var(--indigo-600)", fill = "rgb(99 102 241 / 0.16)", w = 96, h = 32 }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, h - 2 - ((v - min) / range) * (h - 4)]);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

function StatCard({ title, value, icon, tone = "indigo", description, trend, sparkline }) {
  // Allow icon = string name (key into STAT_ICONS) OR JSX element OR emoji string
  let iconNode = null;
  if (typeof icon === "string" && STAT_ICONS[icon]) {
    iconNode = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
           width="20" height="20" style={{ color: TONE_FG[tone] }}>
        {STAT_ICONS[icon]}
      </svg>
    );
  } else if (typeof icon === "string") {
    // legacy: emoji fallback
    iconNode = <span style={{ fontSize: 22 }}>{icon}</span>;
  } else {
    iconNode = icon;
  }

  return (
    <div className="card" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
      <div className="flex items-center justify-between" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--gray-500)",
                      letterSpacing: "0.01em" }}>{title}</p>
          <p style={{ margin: "10px 0 0", fontSize: 32, fontWeight: 700, color: "var(--gray-900)",
                      lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {value}
          </p>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: TONE_BG[tone], display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {iconNode}
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 16, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {trend && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 8px", borderRadius: 9999,
              background: trend.positive ? "#dcfce7" : "#fee2e2",
              color: trend.positive ? "#15803d" : "#b91c1c",
              fontSize: 11, fontWeight: 600,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {trend.positive
                  ? <path d="M12 19V5M5 12l7-7 7 7" />
                  : <path d="M12 5v14M5 12l7 7 7-7" />}
              </svg>
              {trend.value}
            </span>
          )}
          {description && (
            <span style={{ fontSize: 12, color: "var(--gray-500)",
                           overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {description}
            </span>
          )}
        </div>
        {sparkline && (
          <Sparkline data={sparkline}
                     color={TONE_FG[tone]}
                     fill={tone === "indigo" ? "rgb(99 102 241 / 0.16)"
                          : tone === "green"  ? "rgb(22 163 74 / 0.14)"
                          : tone === "blue"   ? "rgb(37 99 235 / 0.14)"
                                              : "rgb(180 83 9 / 0.14)"} />
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Spinner, Button, Badge, Avatar, Input, Field, StatCard, Sparkline });
