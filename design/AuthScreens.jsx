// Spectacular landing — multi-section, with a live animated poll-results hero card.
// Stays inside the design system: indigo only, system font, flat surfaces, gray-200 borders.
// The only motion is bar fills + auto-cycling poll content.

const { useEffect, useState: useStateL, useMemo } = React;

const ROTATING_POLLS = [
  {
    q: "How would you rate your overall workload?",
    responses: 247,
    options: [
      { t: "Light",       pct: 12 },
      { t: "Just right",  pct: 51 },
      { t: "Heavy",       pct: 28 },
      { t: "Overwhelming", pct: 9 },
    ],
  },
  {
    q: "Which framework do you reach for first?",
    responses: 1842,
    options: [
      { t: "React",   pct: 58 },
      { t: "Vue",     pct: 18 },
      { t: "Svelte",  pct: 14 },
      { t: "Solid",   pct: 10 },
    ],
  },
  {
    q: "Where should we hold the offsite?",
    responses: 38,
    options: [
      { t: "Lisbon",    pct: 42 },
      { t: "Berlin",    pct: 26 },
      { t: "Mexico City", pct: 22 },
      { t: "Stay remote", pct: 10 },
    ],
  },
];

/* Animated live-results card. Cycles through ROTATING_POLLS every 4.5s. Bars fill from 0. */
function LiveResultsCard({ delay = 0, rotate = 0, opacity = 1, zIndex = 1, offset = { x:0, y:0 } }) {
  const [idx, setIdx] = useStateL(0);
  const [fill, setFill] = useStateL(false);

  useEffect(() => {
    const start = setTimeout(() => setFill(true), 200 + delay);
    return () => clearTimeout(start);
  }, [idx, delay]);

  useEffect(() => {
    const t = setInterval(() => {
      setFill(false);
      setTimeout(() => setIdx((p) => (p + 1) % ROTATING_POLLS.length), 350);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const poll = ROTATING_POLLS[idx];

  return (
    <div style={{
      position: "absolute",
      top: offset.y, left: offset.x,
      width: 340,
      background: "#fff",
      border: "1px solid var(--gray-200)",
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 20px 50px -12px rgb(31 41 55 / 0.18), 0 8px 16px -8px rgb(31 41 55 / 0.10)",
      transform: `rotate(${rotate}deg)`,
      opacity,
      zIndex,
      transition: "transform 400ms ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{
          width: 6, height: 6, borderRadius: 9999, background: "#16a34a",
          boxShadow: "0 0 0 0 rgb(22 163 74 / 0.6)",
          animation: "pulse 2s infinite",
        }} />
        <span style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 600,
                       textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Live · {poll.responses} responses
        </span>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "var(--gray-900)", lineHeight: 1.35 }}>
        {poll.q}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {poll.options.map((o, i) => {
          const isTop = i === 0 || o.pct === Math.max(...poll.options.map((x) => x.pct));
          const max = Math.max(...poll.options.map((x) => x.pct));
          const leader = o.pct === max;
          return (
            <div key={`${idx}-${i}`}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: "var(--gray-700)", fontWeight: leader ? 600 : 400 }}>{o.t}</span>
                <span className="mono" style={{ color: leader ? "var(--indigo-600)" : "var(--gray-500)",
                                                fontFamily: "ui-monospace, Menlo, monospace",
                                                fontWeight: 500, fontSize: 11 }}>{o.pct}%</span>
              </div>
              <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 9999, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: fill ? `${o.pct}%` : "0%",
                  background: leader ? "var(--indigo-600)" : "var(--indigo-300)",
                  borderRadius: 9999,
                  transition: `width ${900 + i * 120}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Hero — left text + right floating cards stack */
function LandingHero({ onNav }) {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: "#fff" }}>
      {/* soft indigo wash background */}
      <div style={{
        position: "absolute", top: -160, right: -80, width: 720, height: 720,
        background: "radial-gradient(closest-side, rgb(99 102 241 / 0.13), transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* dotted grid background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgb(99 102 241 / 0.10) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "linear-gradient(180deg, black, transparent 80%)",
        WebkitMaskImage: "linear-gradient(180deg, black, transparent 80%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 32px 96px", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 420px", gap: 64, alignItems: "center" }}
             className="hero-grid">
          <div>
            {/* Eyebrow */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
                          background: "var(--indigo-50)", color: "var(--indigo-700)",
                          padding: "4px 12px", borderRadius: 9999,
                          fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: "var(--indigo-600)" }} />
              Anonymous · Cookie-deduped · Free
            </div>

            <h1 style={{
              margin: "20px 0 0",
              fontSize: "clamp(40px, 6vw, 72px)",
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
              fontWeight: 700,
              color: "var(--gray-900)",
            }}>
              Ask anyone.<br />
              See it{" "}
              <span style={{ position: "relative", whiteSpace: "nowrap" }}>
                <span style={{ position: "relative", zIndex: 1, color: "var(--indigo-600)" }}>instantly</span>
                <svg viewBox="0 0 240 20" preserveAspectRatio="none"
                     style={{ position: "absolute", left: 0, right: 0, bottom: -8, width: "100%", height: 16, zIndex: 0 }}
                     fill="none" stroke="var(--indigo-300)" strokeWidth="3" strokeLinecap="round">
                  <path d="M4 14 Q 60 4, 120 12 T 236 8" />
                </svg>
              </span>.
            </h1>

            <p style={{
              margin: "24px 0 0", maxWidth: 520,
              fontSize: 18, lineHeight: 1.55, color: "var(--gray-600)",
            }}>
              Single-choice, multiple-choice, and free-text polls. Share a link.
              Watch responses stream in. Export to CSV when you're done.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <Button size="lg" onClick={() => onNav("register")}>
                Create your first poll
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Button>
              <Button size="lg" variant="secondary" onClick={() => onNav("login")}>Sign in</Button>
            </div>

            {/* Trust strip */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 32, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {["AP", "JK", "SM", "LZ"].map((init, i) => (
                  <div key={init} style={{
                    width: 32, height: 32, borderRadius: 9999,
                    background: ["#e0e7ff", "#dcfce7", "#dbeafe", "#fee2e2"][i],
                    color: ["#4338ca", "#15803d", "#1d4ed8", "#b91c1c"][i],
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600,
                    border: "2px solid #fff",
                    marginLeft: i === 0 ? 0 : -8,
                  }}>{init}</div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                <b style={{ color: "var(--gray-900)" }}>12,847</b> polls launched this week
              </div>
            </div>
          </div>

          {/* Right: floating cards stack */}
          <div style={{ position: "relative", height: 480 }} className="hero-stack">
            <LiveResultsCard offset={{ x: 40, y: 40 }} rotate={4}   opacity={0.5} zIndex={1} delay={200} />
            <LiveResultsCard offset={{ x: 20, y: 20 }} rotate={-3}  opacity={0.75} zIndex={2} delay={100} />
            <LiveResultsCard offset={{ x: 0,  y: 0  }} rotate={0}   opacity={1}    zIndex={3} delay={0} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* Live, interactive demo poll. User clicks an answer, bars fill. */
function LandingTryIt() {
  const [picked, setPicked] = useStateL(null);
  const opts = [
    { t: "Tabs",   pct: 64 },
    { t: "Spaces", pct: 31 },
    { t: "Either", pct: 5  },
  ];
  return (
    <section style={{ background: "var(--gray-50)", borderTop: "1px solid var(--gray-200)",
                      borderBottom: "1px solid var(--gray-200)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 32px",
                    display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: 64, alignItems: "center" }} className="try-grid">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
                        color: "var(--indigo-700)", fontSize: 12, fontWeight: 600,
                        letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: "var(--indigo-600)" }} />
            Try it
          </div>
          <h2 style={{ margin: "12px 0 0", fontSize: 36, lineHeight: 1.1,
                       letterSpacing: "-0.025em", fontWeight: 700, color: "var(--gray-900)" }}>
            One click. Instant&nbsp;results.
          </h2>
          <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.55, color: "var(--gray-600)",
                      maxWidth: 440 }}>
            No login. No friction. Pick an option and watch the bars fill —
            that's the same experience your respondents get.
          </p>
        </div>

        <div className="card card-md" style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: "#16a34a",
                           animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 600,
                           textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Live · 3,127 responses
            </span>
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 600, color: "var(--gray-900)" }}>
            Tabs or spaces?
          </p>

          {picked === null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {opts.map((o) => (
                <button key={o.t} onClick={() => setPicked(o.t)}
                  style={{
                    textAlign: "left", padding: "12px 14px",
                    border: "1px solid var(--gray-200)", borderRadius: 8,
                    background: "#fff", cursor: "pointer", fontSize: 14, color: "var(--gray-700)",
                    transition: "border-color 200ms ease, background-color 200ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--indigo-500)"; e.currentTarget.style.background = "var(--indigo-50)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--gray-200)"; e.currentTarget.style.background = "#fff"; }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 16, height: 16, border: "2px solid var(--gray-300)",
                                   borderRadius: 9999, display: "inline-block" }} />
                    {o.t}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {opts.map((o, i) => {
                const isPicked = o.t === picked;
                const max = Math.max(...opts.map((x) => x.pct));
                const leader = o.pct === max;
                return (
                  <div key={o.t}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: isPicked ? "var(--indigo-700)" : "var(--gray-700)",
                                     fontWeight: isPicked ? 600 : 400,
                                     display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {o.t}
                        {isPicked && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                               stroke="var(--indigo-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                      <span style={{ color: leader ? "var(--indigo-600)" : "var(--gray-500)",
                                     fontWeight: 500, fontSize: 12,
                                     fontFamily: "ui-monospace, Menlo, monospace" }}>{o.pct}%</span>
                    </div>
                    <div style={{ height: 10, background: "var(--gray-100)", borderRadius: 9999, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${o.pct}%`,
                        background: leader ? "var(--indigo-600)" : "var(--indigo-300)",
                        borderRadius: 9999,
                        transition: `width ${800 + i * 150}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                      }} />
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setPicked(null)}
                style={{ alignSelf: "flex-start", marginTop: 4, fontSize: 13,
                         color: "var(--indigo-600)", background: "transparent", border: 0, cursor: "pointer", padding: 0 }}>
                ← Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* Features grid — 6 cards, Heroicons */
function LandingFeatures() {
  const items = [
    {
      title: "Three question types",
      body: "Single-choice, multi-select, and free-text. Mix and match in one poll.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.4 48.4 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
      ),
    },
    {
      title: "Anonymous by default",
      body: "Respondents need no account. Cookie-based dedup prevents accidental re-submits.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      ),
    },
    {
      title: "Live analytics",
      body: "Per-question breakdowns and a response timeline that updates as answers roll in.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      ),
    },
    {
      title: "Public or private",
      body: "Share a public link or generate a revocable access token. Regen it any time.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      ),
    },
    {
      title: "Export to CSV",
      body: "One click downloads a clean CSV of every response. Hook into your own pipeline.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      ),
    },
    {
      title: "Admin panel",
      body: "Manage every user and every poll in the system. Bulk actions, filters, export.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      ),
    },
  ];
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 32px 32px" }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
                        color: "var(--indigo-700)", fontSize: 12, fontWeight: 600,
                        letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Everything you need
          </div>
          <h2 style={{ margin: "12px 0 0", fontSize: 40, lineHeight: 1.1,
                       letterSpacing: "-0.025em", fontWeight: 700, color: "var(--gray-900)" }}>
            Built for asking. Not&nbsp;a&nbsp;framework.
          </h2>
        </div>

        <div style={{ marginTop: 48, display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: 16 }}>
          {items.map((it) => (
            <div key={it.title} className="card card-md feature-card"
                 style={{ transition: "transform 200ms ease, border-color 200ms ease" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "var(--indigo-50)", color: "var(--indigo-600)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.6">
                  {it.icon}
                </svg>
              </div>
              <h3 style={{ margin: "16px 0 6px", fontSize: 16, fontWeight: 600, color: "var(--gray-900)" }}>
                {it.title}
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--gray-600)", lineHeight: 1.55 }}>
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Stats strip */
function LandingStats() {
  const items = [
    { value: "12,847", label: "Polls launched this week" },
    { value: "2.1M",   label: "Responses collected" },
    { value: "<200ms", label: "Median response submit" },
    { value: "0",      label: "Tracking cookies set" },
  ];
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px 64px" }}>
        <div style={{
          background: "var(--gray-900)", borderRadius: 16,
          padding: "32px 24px", color: "#fff",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}>
          {items.map((s, i) => (
            <div key={s.label} style={{
              textAlign: "center",
              borderRight: i < items.length - 1 ? "1px solid var(--gray-700)" : "none",
              padding: "8px 4px",
            }}>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em",
                            fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
                {s.value}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: "var(--gray-400)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Final CTA banner */
function LandingCTA({ onNav }) {
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px 96px" }}>
        <div style={{
          position: "relative", overflow: "hidden",
          background: "var(--indigo-600)",
          borderRadius: 20, padding: "56px 48px",
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 24,
        }}>
          {/* decorative grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgb(255 255 255 / 0.16) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)",
            WebkitMaskImage: "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ margin: 0, fontSize: 36, lineHeight: 1.1,
                         letterSpacing: "-0.025em", fontWeight: 700, color: "#fff" }}>
              Ready to ask?
            </h2>
            <p style={{ margin: "10px 0 0", fontSize: 16, color: "rgb(224 231 255 / 0.9)", maxWidth: 460 }}>
              Create a poll in under a minute. No credit card. Cancel by not signing in again.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, position: "relative" }}>
            <button onClick={() => onNav("register")}
              style={{
                background: "#fff", color: "var(--indigo-700)",
                padding: "12px 24px", borderRadius: 6, fontSize: 16, fontWeight: 600,
                border: 0, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 8,
                transition: "background-color 200ms ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--gray-100)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
            >
              Get started free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => onNav("login")}
              style={{
                background: "transparent", color: "#fff",
                padding: "12px 24px", borderRadius: 6, fontSize: 16, fontWeight: 600,
                border: "1px solid rgb(255 255 255 / 0.3)", cursor: "pointer",
                transition: "background-color 200ms ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgb(255 255 255 / 0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >Sign in</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Top nav bar */
function LandingNav({ onNav }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30,
      background: "rgb(255 255 255 / 0.8)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--gray-200)",
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 32px",
                    display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="logo-mark.svg" width={28} height={28} alt="" />
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-900)",
                         letterSpacing: "-0.015em" }}>Polls</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => onNav("login")}
            style={{ padding: "8px 14px", border: 0, background: "transparent",
                     color: "var(--gray-700)", fontWeight: 500, fontSize: 14, cursor: "pointer",
                     borderRadius: 6 }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--gray-100)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >Sign in</button>
          <Button size="sm" onClick={() => onNav("register")}>Get started</Button>
        </div>
      </div>
    </header>
  );
}

function LandingScreen({ onNav }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgb(22 163 74 / 0.6); }
          50%      { box-shadow: 0 0 0 6px rgb(22 163 74 / 0); }
        }
        .feature-card:hover { transform: translateY(-2px); border-color: var(--indigo-300) !important; }
        @media (max-width: 880px) {
          .hero-grid, .try-grid { grid-template-columns: 1fr !important; }
          .hero-stack { height: 440px !important; }
        }
      `}</style>
      <LandingNav onNav={onNav} />
      <LandingHero onNav={onNav} />
      <LandingTryIt />
      <LandingFeatures />
      <LandingStats />
      <LandingCTA onNav={onNav} />
    </div>
  );
}

/* Split layout shared by Sign in + Register.
   Left: branding + benefits + one floating live-results card.
   Right: the form. Mirrors the landing's visual vocabulary. */
function AuthSplit({ side, children, onNav }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", position: "relative", overflow: "hidden" }}>
      <style>{`
        @media (max-width: 920px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-left { padding: 32px 24px !important; }
          .auth-floater { display: none !important; }
        }
      `}</style>

      {/* Backdrop — indigo wash + dotted grid (top-right anchored) */}
      <div style={{
        position: "absolute", top: -180, right: -160, width: 720, height: 720,
        background: "radial-gradient(closest-side, rgb(99 102 241 / 0.14), transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgb(99 102 241 / 0.10) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "linear-gradient(135deg, black, transparent 70%)",
        WebkitMaskImage: "linear-gradient(135deg, black, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Top bar with logo + tiny "back to home" */}
      <header style={{ position: "relative", zIndex: 2, padding: "20px 32px",
                       display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onNav("landing"); }}
           style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="logo-mark.svg" width={28} height={28} alt="" />
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-900)",
                         letterSpacing: "-0.015em" }}>Polls</span>
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); onNav("landing"); }}
           style={{ fontSize: 13, color: "var(--gray-500)", textDecoration: "none",
                    display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </a>
      </header>

      <div className="auth-grid" style={{
        position: "relative", zIndex: 1,
        maxWidth: 1120, margin: "0 auto",
        padding: "20px 32px 64px",
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) 460px",
        gap: 64, alignItems: "center", minHeight: "calc(100vh - 84px)",
      }}>
        {/* Left: brand-side content */}
        <div className="auth-left" style={{ position: "relative" }}>
          {side}

          {/* Floating decorative live-results card */}
          <div className="auth-floater" style={{
            position: "absolute", bottom: -40, left: -40,
            width: 300, transform: "rotate(-3deg)", opacity: 0.85,
            pointerEvents: "none",
          }}>
            <div style={{ position: "relative" }}>
              <LiveResultsCard offset={{ x: 0, y: 0 }} rotate={0} opacity={1} zIndex={1} />
            </div>
          </div>
        </div>

        {/* Right: form column */}
        <div style={{ position: "relative", zIndex: 5 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function AuthBenefits() {
  const items = [
    "Single, multiple-choice, and free-text questions",
    "Real-time results with per-question breakdowns",
    "Anonymous responses · cookie-deduped",
    "Public links or revocable private tokens",
  ];
  return (
    <ul style={{ listStyle: "none", margin: "32px 0 0", padding: 0,
                 display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((it) => (
        <li key={it} style={{ display: "flex", alignItems: "flex-start", gap: 12,
                              fontSize: 15, color: "var(--gray-700)", lineHeight: 1.4 }}>
          <span style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 9999,
            background: "var(--indigo-50)", color: "var(--indigo-600)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginTop: 1,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}

function AuthFormCard({ children }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--gray-200)",
      borderRadius: 16,
      padding: 36,
      boxShadow: "0 20px 50px -12px rgb(31 41 55 / 0.12), 0 8px 16px -8px rgb(31 41 55 / 0.08)",
    }}>
      {children}
    </div>
  );
}

function LoginScreen({ onSubmit, onNav, isSubmitting, errors = {} }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  return (
    <AuthSplit
      onNav={onNav}
      side={
        <>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
                        background: "var(--indigo-50)", color: "var(--indigo-700)",
                        padding: "4px 12px", borderRadius: 9999,
                        fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: "var(--indigo-600)" }} />
            Welcome back
          </div>
          <h1 style={{
            margin: "20px 0 0",
            fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.04, letterSpacing: "-0.03em", fontWeight: 700,
            color: "var(--gray-900)",
          }}>
            Sign in to keep<br />
            <span style={{ color: "var(--indigo-600)" }}>asking</span>.
          </h1>
          <p style={{ margin: "20px 0 0", maxWidth: 460, fontSize: 17, lineHeight: 1.55, color: "var(--gray-600)" }}>
            Your polls, your responses, your analytics — pick up exactly where you left off.
          </p>
          <AuthBenefits />
        </>
      }
    >
      <AuthFormCard>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.015em",
                     color: "var(--gray-900)" }}>Sign in</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--gray-500)" }}>
          Enter your email and password.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit?.({ email, password }); }}
          style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}
        >
          <Input label="Email" type="email" placeholder="you@example.com"
                 value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="label" htmlFor="login-pw" style={{ marginBottom: 4 }}>Password</label>
              <a href="#" onClick={(e) => e.preventDefault()}
                 style={{ fontSize: 12, color: "var(--indigo-600)" }}>Forgot?</a>
            </div>
            <input id="login-pw" className="input" type="password" placeholder="••••••••"
                   value={password} onChange={(e) => setPassword(e.target.value)} />
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>
          <Button type="submit" size="lg" isLoading={isSubmitting} style={{ width: "100%" }}>
            Sign in
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Button>
        </form>
        <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: 14, color: "var(--gray-600)" }}>
          Don't have an account?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); onNav("register"); }}
             style={{ fontWeight: 500 }}>Create one</a>
        </p>
      </AuthFormCard>

      <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--gray-500)" }}>
        Demo credentials: <span style={{ fontFamily: "ui-monospace, Menlo, monospace",
                                          color: "var(--gray-700)" }}>admin@example.com</span>
        {" · "}
        <span style={{ fontFamily: "ui-monospace, Menlo, monospace",
                       color: "var(--gray-700)" }}>Admin1234!</span>
      </div>
    </AuthSplit>
  );
}

function RegisterScreen({ onSubmit, onNav, isSubmitting }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  return (
    <AuthSplit
      onNav={onNav}
      side={
        <>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
                        background: "var(--indigo-50)", color: "var(--indigo-700)",
                        padding: "4px 12px", borderRadius: 9999,
                        fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: "var(--indigo-600)" }} />
            Free · No credit card
          </div>
          <h1 style={{
            margin: "20px 0 0",
            fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.04, letterSpacing: "-0.03em", fontWeight: 700,
            color: "var(--gray-900)",
          }}>
            Create your<br />
            <span style={{ color: "var(--indigo-600)" }}>first poll</span> in 60s.
          </h1>
          <p style={{ margin: "20px 0 0", maxWidth: 460, fontSize: 17, lineHeight: 1.55, color: "var(--gray-600)" }}>
            One account, unlimited polls. Share a link, collect responses, watch the bars fill.
          </p>
          <AuthBenefits />
        </>
      }
    >
      <AuthFormCard>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.015em",
                     color: "var(--gray-900)" }}>Create account</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--gray-500)" }}>
          Takes about a minute.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit?.({ name, email, password }); }}
          style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}
        >
          <Input label="Name" placeholder="Alex Petrov" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" placeholder="you@example.com"
                 value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="At least 8 characters"
                   value={password} onChange={(e) => setPassword(e.target.value)} />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--gray-500)" }}>
              Use 8+ characters with a mix of letters, numbers &amp; symbols.
            </p>
          </div>
          <Button type="submit" size="lg" isLoading={isSubmitting} style={{ width: "100%" }}>
            Create account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Button>
        </form>
        <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: 14, color: "var(--gray-600)" }}>
          Already have an account?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); onNav("login"); }}
             style={{ fontWeight: 500 }}>Sign in</a>
        </p>
      </AuthFormCard>

      <p style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--gray-500)",
                  maxWidth: 380, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
    </AuthSplit>
  );
}

Object.assign(window, { LandingScreen, LoginScreen, RegisterScreen, AuthSplit, AuthFormCard });
