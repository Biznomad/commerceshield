import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Network,
  SlidersHorizontal,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Package,
  RotateCcw,
  Search,
  X,
  Plus,
  Eye,
  CircleHelp,
  LogOut,
  Activity,
  FileCheck2,
  AlertCircle,
  Copy,
} from "lucide-react";
import {
  api,
  money,
  human,
  type Workspace,
  type Template,
  type Case,
  type Niche,
  type Rule,
} from "./api";
const Graph = lazy(() => import("./Graph"));
type Tab = "overview" | "cases" | "graph" | "rules" | "connect";
const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["cases", "Case review", FileCheck2],
  ["graph", "Relationship map", Network],
  ["rules", "Rules & policy", SlidersHorizontal],
  ["connect", "Integrate", BookOpen],
] as const;
function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("cs_token") ?? "",
  );
  const activeToken = useRef(token);
  activeToken.current = token;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [graph, setGraph] = useState<any>({ nodes: [], links: [] });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [demos, setDemos] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  useEffect(() => {
    api<Template[]>("/templates")
      .then(setTemplates)
      .catch((e) => setError(e.message));
    api<any>("/demo")
      .then((d) => setDemos(d.workspaces))
      .catch(() => {});
  }, []);
  async function refresh(key = token) {
    const [w, c, g] = await Promise.all([
      api<Workspace>("/workspace", key),
      api<Case[]>("/cases", key),
      api<any>("/graph", key),
    ]);
    if (activeToken.current !== key) return;
    setWorkspace(w);
    setCases(c);
    setGraph(g);
  }
  useEffect(() => {
    if (token) {
      sessionStorage.setItem("cs_token", token);
      refresh(token).catch((e) => {
        if (activeToken.current === token) {
          setError(e.message);
          setWorkspace(null);
        }
      });
    } else {
      sessionStorage.removeItem("cs_token");
      setWorkspace(null);
    }
  }, [token]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function login(key: string) {
    activeToken.current = key;
    setWorkspace(null);
    setCases([]);
    setGraph({ nodes: [], links: [] });
    setError("");
    setSelected(null);
    setTab("overview");
    setToken(key);
  }
  const current = cases.find((c) => c.id === selected);
  const open = cases.filter((c) => c.status === "open");
  const flagged = open.filter((c) => c.assessment.recommendation === "review");
  const exposure = flagged.reduce((s, c) => s + c.event.amount, 0);
  const resolved = cases.filter((c) => c.status === "resolved");
  const visible = cases.filter(
    (c) =>
      (c.externalId + " " + c.event.account + " " + c.event.order)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "review"
          ? c.status === "open" && c.assessment.recommendation === "review"
          : c.status === filter)),
  );
  return (
    <>
      {!workspace ? (
        <Onboard
          templates={templates}
          demos={demos}
          busy={busy}
          error={error}
          onLogin={login}
          onCreate={(body) =>
            act(async () => {
              const r = await api<any>("/workspaces", "", body);
              setNewKey(r.token);
              login(r.token);
            })
          }
        />
      ) : (
        <div className="app-layout">
          <aside className="sidebar">
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setTab("overview");
              }}
            >
              <span className="brand-icon">
                <ShieldCheck size={23} />
              </span>
              <span>
                commerce<strong>shield</strong>
                <small>RISK INTELLIGENCE</small>
              </span>
            </a>
            <div className="workspace-card">
              <span className="avatar">{workspace.name.slice(0, 1)}</span>
              <div>
                <strong>{workspace.name}</strong>
                <small>{workspace.template.name}</small>
              </div>
              <ChevronRight size={14} />
            </div>
            <span className="nav-label">WORKSPACE</span>
            <nav>
              {nav.map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={tab === id ? "active" : ""}
                  onClick={() => {
                    setTab(id);
                    setSelected(null);
                  }}
                >
                  <Icon size={18} />
                  {label}
                  {id === "cases" && <em>{open.length}</em>}
                </button>
              ))}
            </nav>
            <div className="sidebar-foot">
              <div className="observe-box">
                <Eye size={18} />
                <div>
                  <strong>Observation mode</strong>
                  <p>Learn first. Review with context.</p>
                </div>
                <i />
              </div>
              <p>
                Decisions stay with your team.
                <br />
                No automated blocks or denials.
              </p>
              <button
                className="sidebar-signout"
                onClick={() => {
                  setToken("");
                  setNewKey("");
                }}
              >
                <LogOut size={16} /> Switch workspace
              </button>
              <span className="version">FOUNDATION v0.1 · LOCAL WORKSPACE</span>
            </div>
          </aside>
          <div className="main-area">
            <header className="topbar">
              <span>
                {workspace.template.name}
                <ChevronRight size={13} />
                <strong>{nav.find((n) => n[0] === tab)?.[1]}</strong>
              </span>
              <div>
                <span className="synthetic-badge">
                  {token.startsWith("cs_demo_")
                    ? "FICTIONAL DEMO"
                    : "LOCAL FOUNDATION"}
                </span>
                <button
                  className="icon"
                  aria-label="Refresh workspace"
                  onClick={() =>
                    act(async () => {
                      await refresh();
                      setNotice("Workspace refreshed.");
                    })
                  }
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  className="user-avatar"
                  aria-label="Sign out of workspace"
                  onClick={() => {
                    setToken("");
                    setNewKey("");
                  }}
                >
                  CS
                </button>
              </div>
            </header>
            <main>
              <div className="page-title">
                <div>
                  <p className="eyebrow">YOUR RISK WORKSPACE</p>
                  <h1>
                    {tab === "overview"
                      ? "See the whole story."
                      : tab === "cases"
                        ? "Every case, in context."
                        : tab === "graph"
                          ? "Follow the connections."
                          : tab === "rules"
                            ? "Your business. Your policy."
                            : "Connect your workflow."}
                  </h1>
                  <p>
                    {tab === "overview"
                      ? "A clearer view of claims, signals, and the connections between them."
                      : tab === "cases"
                        ? "Review the evidence. Record what your team knows."
                        : tab === "graph"
                          ? "Explore relationships across accounts, orders, claims, and shared identifiers."
                          : tab === "rules"
                            ? "Tune explainable signals for future events. Past assessments keep their original policy."
                            : "Start with a sample event, then connect your own event source."}
                  </p>
                </div>
                <span className="mode-pill">
                  <i /> Observing
                </span>
              </div>
              {error && (
                <div role="alert" className="message error">
                  <AlertCircle size={18} />
                  {error}
                  <button
                    onClick={() => setError("")}
                    aria-label="Dismiss error"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {notice && (
                <div role="status" className="message">
                  <Check size={18} />
                  {notice}
                  <button
                    onClick={() => setNotice("")}
                    aria-label="Dismiss message"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {newKey && (
                <div className="key-notice">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>Your workspace is ready. Save your API key.</strong>
                    <p>
                      It is shown once here; this browser tab keeps it only for
                      this session.
                    </p>
                    <code>
                      {showKey ? newKey : "••••••••••••••••••••••••••••••••"}
                    </code>
                    <button onClick={() => setShowKey(!showKey)}>
                      {showKey ? "Hide" : "Reveal"}
                    </button>
                    <button
                      onClick={() =>
                        act(async () => {
                          await navigator.clipboard.writeText(newKey);
                          setNotice("API key copied. Store it securely.");
                        })
                      }
                    >
                      Copy key
                    </button>
                  </div>
                  <button
                    className="icon"
                    aria-label="Dismiss API key"
                    onClick={() => setNewKey("")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {(tab === "overview" || tab === "cases") && (
                <>
                  <div className="metrics">
                    {(workspace.dashboard === "queue"
                      ? [
                          ["Open cases", open.length, "Ready for your team"],
                          [
                            "Needs review",
                            flagged.length,
                            "Signals or missing evidence",
                          ],
                          [
                            workspace.template.priority,
                            money(exposure),
                            "Open review cases · USD",
                          ],
                          [
                            "Outcomes recorded",
                            resolved.length,
                            "Human review feedback",
                          ],
                        ]
                      : workspace.dashboard === "outcomes"
                        ? [
                            [
                              "Outcomes recorded",
                              resolved.length,
                              "Human review feedback",
                            ],
                            ["Open cases", open.length, "Ready for your team"],
                            [
                              "Needs review",
                              flagged.length,
                              "Signals or missing evidence",
                            ],
                            [
                              workspace.template.priority,
                              money(exposure),
                              "Open review cases · USD",
                            ],
                          ]
                        : [
                            [
                              workspace.template.priority,
                              money(exposure),
                              "Open review cases · USD",
                            ],
                            [
                              "Needs review",
                              flagged.length,
                              "Signals or missing evidence",
                            ],
                            ["Open cases", open.length, "Ready for your team"],
                            [
                              "Outcomes recorded",
                              resolved.length,
                              "Human review feedback",
                            ],
                          ]
                    ).map(([label, value, desc], i) => (
                      <div className="metric" key={label}>
                        <span>
                          {label}
                          <Activity size={15} />
                        </span>
                        <strong>{value}</strong>
                        <small>{desc}</small>
                      </div>
                    ))}
                  </div>
                  {tab === "overview" && (
                    <div className="overview-grid">
                      <section className="panel">
                        <div className="section-heading">
                          <div>
                            <h2>Connected risk</h2>
                            <p>Relationships worth a closer look</p>
                          </div>
                          <button
                            className="text-button"
                            onClick={() => setTab("graph")}
                          >
                            Explore map <ArrowUpRight size={16} />
                          </button>
                        </div>
                        <Suspense
                          fallback={
                            <div className="graph-loading">
                              Loading relationship explorer…
                            </div>
                          }
                        >
                          <Graph data={graph} onCase={setSelected} />
                        </Suspense>
                      </section>
                      <section className="panel priorities">
                        <span className="eyebrow">REVIEW PLAYBOOK</span>
                        <h2>
                          Evidence before
                          <br /> an outcome.
                        </h2>
                        <p>
                          A signal starts a question. Your team makes the call.
                        </p>
                        <ol>
                          {workspace.template.workflow.map((step, i) => (
                            <li key={step}>
                              <span>{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                        <div className="priority-note">
                          <Eye size={22} />
                          <strong>Watching, never blocking</strong>
                          <p>
                            Scores prioritize review. They do not determine
                            coverage, eligibility, or fraud.
                          </p>
                        </div>
                        <button
                          className="primary"
                          onClick={() => setTab("cases")}
                        >
                          Open review queue <ArrowRight size={16} />
                        </button>
                      </section>
                    </div>
                  )}
                  <section className="panel case-panel">
                    <div className="section-heading">
                      <div>
                        <h2>
                          {tab === "overview"
                            ? "Your review queue"
                            : "Case workspace"}
                        </h2>
                        <p>
                          {cases.length
                            ? "Latest assessments and recorded outcomes"
                            : "Send your first event to start reviewing"}
                        </p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setTab("connect")}
                      >
                        <Plus size={16} /> Add event
                      </button>
                    </div>
                    <div className="table-toolbar">
                      <div className="filter-tabs">
                        {[
                          ["all", "All cases"],
                          ["review", "Needs review"],
                          ["resolved", "Resolved"],
                        ].map(([key, label]) => (
                          <button
                            key={key}
                            className={filter === key ? "selected" : ""}
                            onClick={() => setFilter(key)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <label className="search-input">
                        <Search size={15} />
                        <input
                          aria-label="Search cases"
                          placeholder="Search cases…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Case / customer</th>
                            <th>Order</th>
                            <th>Amount</th>
                            <th>Risk score</th>
                            <th>Review status</th>
                            <th>
                              <span className="sr-only">Action</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <button
                                  className="case-link"
                                  onClick={() => setSelected(c.id)}
                                >
                                  {c.externalId}
                                </button>
                                <small>{c.event.account}</small>
                              </td>
                              <td>{c.event.order}</td>
                              <td>{money(c.event.amount)}</td>
                              <td>
                                <span className={"risk " + c.assessment.band}>
                                  <i />
                                  {c.assessment.score}
                                  <small>{c.assessment.band}</small>
                                </span>
                              </td>
                              <td>
                                <span
                                  className={
                                    "status " +
                                    (c.status === "resolved" ? "resolved" : "")
                                  }
                                >
                                  {c.status === "resolved"
                                    ? human(c.outcome!.decision)
                                    : c.assessment.recommendation === "review"
                                      ? "Needs review"
                                      : "Observing"}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="icon"
                                  aria-label={"Review " + c.externalId}
                                  onClick={() => setSelected(c.id)}
                                >
                                  <ArrowUpRight size={17} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!visible.length && (
                        <div className="empty">
                          <Package size={30} />
                          <h3>
                            {cases.length
                              ? "No cases match your search"
                              : "Your queue is ready"}
                          </h3>
                          <p>
                            {cases.length
                              ? "Try another name or case ID."
                              : "Open Integrate to send a sample event."}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="table-footer">
                      <span>
                        {visible.length} cases · scores are indicators, not
                        findings
                      </span>
                      <span>Policy v{workspace.version}</span>
                    </div>
                  </section>
                </>
              )}
              {tab === "graph" && (
                <>
                  {token.startsWith("cs_demo_") && (
                    <GraphGuide
                      onOpen={() =>
                        setSelected(
                          cases.find(
                            (c) => c.event.deviceToken === "device_7c2",
                          )?.id ?? null,
                        )
                      }
                    />
                  )}
                  <section className="panel">
                    <Suspense
                      fallback={
                        <div className="graph-loading">
                          Loading relationship explorer…
                        </div>
                      }
                    >
                      <Graph data={graph} onCase={setSelected} />
                    </Suspense>
                  </section>
                  <p className="footnote">
                    Connections reflect identifiers in submitted events. Shared
                    households and devices can be legitimate. No connections
                    cross workspace boundaries.
                  </p>
                </>
              )}
              {tab === "rules" && (
                <Rules
                  key={workspace.version}
                  workspace={workspace}
                  busy={busy}
                  onSave={(body) =>
                    act(async () => {
                      await api("/settings", token, body, "PUT");
                      await refresh();
                      setNotice(
                        "Policy saved. New events use the updated rules.",
                      );
                    })
                  }
                />
              )}
              {tab === "connect" && (
                <Integrate
                  workspace={workspace}
                  busy={busy}
                  token={token}
                  onSend={(body) =>
                    act(async () => {
                      const c = await api<Case>("/events", token, body);
                      await refresh();
                      setSelected(c.id);
                      setNotice("Event assessed in observation mode.");
                    })
                  }
                />
              )}
              <footer className="main-footer">
                <ShieldCheck size={14} />
                <span>Commerce Shield · evidence-led review</span>
                <span>Observation mode · no automated enforcement</span>
              </footer>
            </main>
          </div>
          {current && (
            <CaseDrawer
              c={current}
              error={error}
              busy={busy}
              onClose={() => setSelected(null)}
              onOutcome={(body) =>
                act(async () => {
                  await api("/cases/" + current.id + "/outcomes", token, body);
                  await refresh();
                  setNotice("Human outcome recorded in the audit trail.");
                })
              }
            />
          )}
        </div>
      )}
    </>
  );
}
function GraphGuide({ onOpen }: { onOpen: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Start with the shared device",
      text: "Search device_7c2 in the map. Three fictional accounts use this device: Morgan Lee, Alex Rivera, and Sam Chen. They also share addr_shared_018.",
    },
    {
      title: "Follow the relationships",
      text: "Select the device node. Its linked cases lead to three separate orders and claims. Each color represents a different kind of entity; lines represent submitted relationships.",
    },
    {
      title: "Open a case and inspect the reasons",
      text: "Open a linked case to see the score breakdown, observed signal values, missing evidence, and review playbook. Shared identifiers are context, not proof of abuse.",
    },
    {
      title: "Record what you verified",
      text: "Choose an outcome, add your name and reasoning, and record it. The outcome is saved in the audit trail; no claim is denied and no payment is issued.",
    },
  ];
  return (
    <section className="graph-guide">
      <div>
        <span className="eyebrow">
          FICTIONAL GRAPH WALKTHROUGH · {step + 1} / 4
        </span>
        <h2>{steps[step].title}</h2>
        <p>{steps[step].text}</p>
      </div>
      <div className="guide-actions">
        {step > 0 && (
          <button className="secondary" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {step < 3 ? (
          <button className="primary" onClick={() => setStep(step + 1)}>
            Next step <ArrowRight size={15} />
          </button>
        ) : (
          <button className="primary" onClick={onOpen}>
            Open sample case <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </section>
  );
}
function Onboard({
  templates,
  demos,
  busy,
  error,
  onLogin,
  onCreate,
}: {
  templates: Template[];
  demos: any[];
  busy: boolean;
  error: string;
  onLogin: (key: string) => void;
  onCreate: (body: unknown) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [niche, setNiche] = useState<Niche>("shipping");
  const [threshold, setThreshold] = useState(60);
  const [dashboard, setDashboard] = useState("exposure");
  const [key, setKey] = useState("");
  return (
    <div className="onboarding">
      <aside className="onboard-story">
        <a className="brand" href="#">
          <span className="brand-icon">
            <ShieldCheck size={25} />
          </span>
          <span>
            commerce<strong>shield</strong>
          </span>
        </a>
        <span className="story-label">CLARITY BEFORE THE CALL</span>
        <h1>
          See the pattern.
          <br /> Keep the human
          <br /> in the decision.
        </h1>
        <p>
          A fraud review workspace that starts with your business, your
          evidence, and your rules.
        </p>
        <div className="orb-art">
          <div className="orb-core">
            <ShieldCheck size={44} />
          </div>
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
        <small>
          Local foundation · synthetic demos available
          <br />
          Shipping protection & ecommerce refund review
        </small>
      </aside>
      <main className="onboard-form">
        <div className="onboard-top">
          WORKSPACE SETUP <span>{step} / 3</span>
        </div>
        <div className="step-track">
          {[1, 2, 3].map((n) => (
            <span key={n} className={step >= n ? "done" : ""} />
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) setStep(step + 1);
            else
              onCreate({ name, niche, reviewThreshold: threshold, dashboard });
          }}
        >
          <p className="eyebrow">
            {step === 1
              ? "MAKE IT YOURS"
              : step === 2
                ? "START WITH CONTEXT"
                : "REVIEW YOUR STARTING POLICY"}
          </p>
          <h2>
            {step === 1
              ? "A workspace for your team."
              : step === 2
                ? "What do you review?"
                : "Start by observing."}
          </h2>
          <p className="form-intro">
            {step === 1
              ? "Set up a new workspace or explore a fictional business below."
              : step === 2
                ? "Your niche sets the signals, evidence checklist, and review playbook."
                : "Set your review threshold and dashboard focus. Nothing is automatically blocked."}
          </p>
          {error && (
            <div className="message error" role="alert">
              {error}
            </div>
          )}
          {step === 1 && (
            <label className="field">
              Business or workspace name
              <input
                required
                minLength={2}
                maxLength={80}
                placeholder="e.g. Northstar Protection"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <small>Creates an isolated workspace with its own API key.</small>
            </label>
          )}
          {step === 2 && (
            <div className="niche-options">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={niche === t.id ? "chosen" : ""}
                  onClick={() => setNiche(t.id)}
                >
                  <span className="niche-icon">
                    {t.id === "shipping" ? (
                      <Package size={23} />
                    ) : (
                      <RotateCcw size={23} />
                    )}
                  </span>
                  <div>
                    <strong>{t.name}</strong>
                    <p>{t.description}</p>
                  </div>
                  <span className="radio-dot">
                    {niche === t.id && <Check size={13} />}
                  </span>
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <>
              <div className="setup-summary">
                <Eye size={21} />
                <div>
                  <strong>
                    {name} · {templates.find((t) => t.id === niche)?.name}
                  </strong>
                  <p>
                    Observation only. Every outcome is recorded by a person.
                  </p>
                </div>
              </div>
              <label className="field">
                Review threshold · {threshold}/100
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(+e.target.value)}
                />
                <small>
                  Missing required evidence also routes a case to review.
                </small>
              </label>
              <label className="field">
                Dashboard priority
                <select
                  value={dashboard}
                  onChange={(e) => setDashboard(e.target.value)}
                >
                  <option value="exposure">Financial exposure</option>
                  <option value="queue">Review queue</option>
                  <option value="outcomes">Recorded outcomes</option>
                </select>
              </label>
              <small className="form-intro">
                Evidence checklist:{" "}
                {templates
                  .find((t) => t.id === niche)
                  ?.evidence.map(human)
                  .join(", ")}
                .
              </small>
            </>
          )}
          <div className="form-actions">
            {step > 1 && (
              <button
                className="secondary"
                type="button"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button className="primary" disabled={busy || !templates.length}>
              {busy
                ? "Creating…"
                : step === 3
                  ? "Create workspace"
                  : "Continue"}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <div className="demo-entry">
          {demos.length > 0 && (
            <>
              <p>EXPLORE WITH FICTIONAL DATA</p>
              <div>
                {demos.map((d) => (
                  <button
                    key={d.niche}
                    className="secondary"
                    onClick={() => onLogin(d.token)}
                  >
                    {d.niche === "shipping" ? "Shipping demo" : "Refunds demo"}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </>
          )}
          <details>
            <summary>Open an existing workspace</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onLogin(key.trim());
              }}
            >
              <label className="field">
                Workspace API key
                <input
                  required
                  type="password"
                  autoComplete="off"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="cs_…"
                />
              </label>
              <button className="secondary">Open workspace</button>
            </form>
          </details>
        </div>
      </main>
    </div>
  );
}
function Rules({
  workspace,
  busy,
  onSave,
}: {
  workspace: Workspace;
  busy: boolean;
  onSave: (body: unknown) => void;
}) {
  const [rules, setRules] = useState<Rule[]>(workspace.rules);
  const [threshold, setThreshold] = useState(workspace.threshold);
  const [dashboard, setDashboard] = useState(workspace.dashboard);
  function update(id: string, change: Partial<Rule>) {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ rules, reviewThreshold: threshold, dashboard });
      }}
    >
      <div className="policy-top">
        <section className="panel policy-card">
          <Eye size={22} />
          <h2>Observation mode</h2>
          <p>
            Assess, explain, and route to human review. This foundation has no
            blocking or claim-denial integration.
          </p>
        </section>
        <section className="panel policy-card">
          <h2>Review threshold</h2>
          <label className="field">
            <span>{threshold} / 100</span>
            <input
              aria-label="Review threshold"
              type="range"
              min="1"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(+e.target.value)}
            />
          </label>
          <p>
            Missing required evidence also requires review, regardless of score.
          </p>
        </section>
        <section className="panel policy-card">
          <h2>Dashboard focus</h2>
          <label className="field">
            <select
              aria-label="Dashboard focus"
              value={dashboard}
              onChange={(e) => setDashboard(e.target.value)}
            >
              <option value="exposure">Financial exposure</option>
              <option value="queue">Review queue</option>
              <option value="outcomes">Recorded outcomes</option>
            </select>
          </label>
          <p>Changes the priority of your overview metrics.</p>
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{workspace.template.name} signals</h2>
            <p>
              Policy v{workspace.version} · score capped at 100 · future events
              only
            </p>
          </div>
          <span className="tag">EXPLAINABLE RULES</span>
        </div>
        <div className="rule-list">
          {rules.map((r) => (
            <div className="rule-row" key={r.id}>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => update(r.id, { enabled: e.target.checked })}
                />
                <span>
                  <strong>{r.label}</strong>
                  <code>
                    {r.signal} {r.operator} threshold
                  </code>
                </span>
              </label>
              <label>
                Threshold
                <input
                  aria-label={r.label + " threshold"}
                  type="number"
                  step="any"
                  min="-3650"
                  max="1000000"
                  required
                  value={r.threshold}
                  onChange={(e) => update(r.id, { threshold: +e.target.value })}
                />
              </label>
              <label>
                Points
                <input
                  aria-label={r.label + " points"}
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={r.weight}
                  onChange={(e) => update(r.id, { weight: +e.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
        <div className="policy-footer">
          <p>
            Rules flag patterns, not people. Calibrate against adjudicated
            outcomes before any future automation.
          </p>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save policy"}
            <Check size={16} />
          </button>
        </div>
      </section>
    </form>
  );
}
function CaseDrawer({
  c,
  error,
  busy,
  onClose,
  onOutcome,
}: {
  c: Case;
  error: string;
  busy: boolean;
  onClose: () => void;
  onOutcome: (body: unknown) => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const [decision, setDecision] = useState("inconclusive");
  const [note, setNote] = useState("");
  const [reviewer, setReviewer] = useState("");
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,textarea,a[href]",
        );
        if (items?.length) {
          const first = items[0],
            last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <section
        ref={dialog}
        className="case-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={"Review " + c.externalId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">HUMAN CASE REVIEW</p>
            <h2>{c.externalId}</h2>
            <p>
              {c.event.account} · {c.event.order}
            </p>
          </div>
          <button
            autoFocus
            className="icon"
            aria-label="Close case"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        <div className="drawer-body">
          {error && (
            <div className="message error" role="alert">
              {error}
            </div>
          )}
          <div className="case-score">
            <span className={"score-orb " + c.assessment.band}>
              {c.assessment.score}
              <small>/ 100</small>
            </span>
            <div>
              <strong>{human(c.assessment.band)} signal score</strong>
              <p>
                {c.assessment.recommendation === "review"
                  ? "Human review recommended"
                  : "Continue observing"}
              </p>
              <small>
                Policy v{c.assessment.policyVersion} · {money(c.event.amount)}
              </small>
            </div>
          </div>
          <p className="case-caution">
            A score is a review aid. It is not a probability of fraud or a
            coverage decision.
          </p>
          <h3>Why this score</h3>
          {c.assessment.reasons.length ? (
            c.assessment.reasons.map((r) => (
              <div className="reason" key={r.code}>
                <div>
                  <strong>{r.label}</strong>
                  <small>
                    {r.signal}: {r.observed} · {r.operator} {r.threshold}
                  </small>
                </div>
                <span>+{r.points}</span>
              </div>
            ))
          ) : (
            <p className="muted">No enabled rules matched this event.</p>
          )}
          <h3>Evidence checklist</h3>
          <p className="muted">
            Presence is reported by the event source; your team must verify the
            original evidence.
          </p>
          {c.assessment.requiredEvidence.map((e) => (
            <div className="evidence" key={e}>
              {c.event.evidence.includes(e) ? (
                <Check size={17} />
              ) : (
                <CircleHelp size={17} />
              )}
              <span>{human(e)}</span>
              <small>
                {c.event.evidence.includes(e) ? "Reported present" : "Missing"}
              </small>
            </div>
          ))}
          <h3>Review playbook</h3>
          <ol className="workflow">
            {c.assessment.workflow.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <h3>Record human outcome</h3>
          {c.outcome ? (
            <div className="outcome-box">
              <strong>{human(c.outcome.decision)}</strong>
              <p>{c.outcome.note}</p>
              <small>
                {c.outcome.reviewer} ·{" "}
                {new Date(c.outcome.recordedAt).toLocaleString()}
              </small>
              <p>No external action was taken.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onOutcome({ decision, note, reviewer });
              }}
            >
              <label className="field">
                Review outcome
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                >
                  <option value="inconclusive">
                    Inconclusive — more information needed
                  </option>
                  <option value="legitimate">
                    Legitimate — evidence supports request
                  </option>
                  <option value="suspected_abuse">
                    Suspected abuse — documented indicators
                  </option>
                </select>
              </label>
              <label className="field">
                Reviewer name
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="field">
                Evidence and reasoning
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you verify? Explain your conclusion."
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? "Recording…" : "Record outcome"}
                <Check size={16} />
              </button>
              <p className="muted">
                This records feedback only. It does not approve, reject, or
                issue a payment.
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
function Integrate({
  workspace,
  busy,
  token,
  onSend,
}: {
  workspace: Workspace;
  busy: boolean;
  token: string;
  onSend: (body: unknown) => void;
}) {
  const sample = {
    externalId: "TEST-" + Date.now(),
    kind: workspace.niche === "shipping" ? "shipping_claim" : "refund_request",
    account: "Example Customer",
    order: "ORD-EXAMPLE",
    addressToken: "addr_example",
    deviceToken: "device_example",
    amount: 245,
    signals: {
      claims30d: 3,
      accountAgeDays: 7,
      daysSinceDelivery: 2,
      refundRatio: 0.6,
      linkedAccounts: 1,
      orderValue: 245,
    },
    evidence: ["customer_statement"],
  };
  const [body, setBody] = useState(() => JSON.stringify(sample, null, 2));
  const [parseError, setParseError] = useState("");
  const [audit, setAudit] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  return (
    <div className="integration-grid">
      <section className="panel integration-card">
        <p className="eyebrow">01 · SEND AN EVENT</p>
        <h2>Try the full review flow</h2>
        <p>Submit → assess → explain → review → record outcome.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const parsed = JSON.parse(body);
              setParseError("");
              onSend(parsed);
            } catch {
              setParseError("Enter valid JSON before sending.");
            }
          }}
        >
          <label className="field">
            Normalized event JSON
            <textarea
              className="code-editor"
              rows={24}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {parseError && (
            <p role="alert" className="error-text">
              {parseError}
            </p>
          )}
          <button className="primary" disabled={busy}>
            Send test event <ArrowRight size={16} />
          </button>
        </form>
      </section>
      <div>
        <section className="panel integration-card">
          <p className="eyebrow">02 · CONNECT YOUR SOURCE</p>
          <h2>One tenant-scoped endpoint.</h2>
          <p>
            Call from your server with a workspace key. Retry identical payloads
            with the same external ID.
          </p>
          <pre>{`POST http://127.0.0.1:3001/api/events
Authorization: Bearer $WORKSPACE_KEY
Content-Type: application/json`}</pre>
          <p>
            Use pseudonymous address and device tokens. Do not send card data,
            raw addresses, or documents.
          </p>
          <div className="setup-summary">
            <ShieldCheck size={20} />
            <p>
              Shopify and SurePath adapters are documented extension points. No
              live store connection is configured.
            </p>
          </div>
        </section>
        <section className="panel integration-card audit-card">
          <p className="eyebrow">03 · VERIFY THE TRAIL</p>
          <h2>Workspace activity</h2>
          <button
            className="secondary"
            disabled={loadingAudit}
            onClick={async () => {
              setLoadingAudit(true);
              try {
                setAudit(await api<any[]>("/audit", token));
                setParseError("");
              } catch (e) {
                setParseError((e as Error).message);
              } finally {
                setLoadingAudit(false);
              }
            }}
          >
            {loadingAudit ? "Loading…" : "Load audit trail"}
          </button>
          {audit.map((a) => (
            <div className="audit-row" key={a.id}>
              <strong>{human(a.action.replaceAll(".", " "))}</strong>
              <small>{new Date(a.created_at).toLocaleString()}</small>
            </div>
          ))}
          <p>
            Latest 100 records. Local audit records are append-only through the
            API; this is not tamper-proof storage.
          </p>
        </section>
      </div>
    </div>
  );
}
export default App;
