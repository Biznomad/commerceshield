import {
  Component,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { Object3D } from "three";
import { buildDemoReplay, linkIsVisible } from "./replay";
import { Play, Pause, Search, Maximize2, RotateCcw } from "lucide-react";
class GraphBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="graph-empty">
        3D is unavailable. Use the accessible node list below to inspect
        connections.
      </div>
    ) : (
      this.props.children
    );
  }
}
const colors: Record<string, string> = {
  account: "#65c8ff",
  order: "#bda6ff",
  claim: "#ffb474",
  address: "#6de3bd",
  device: "#f18eb3",
};
export default function Graph({
  data,
  onCase,
  autoPlay = false,
}: {
  data: { nodes: any[]; links: any[] };
  onCase: (id: string) => void;
  autoPlay?: boolean;
}) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const container = useRef<HTMLDivElement>(null);
  const graph = useRef<any>(null);
  const [width, setWidth] = useState(800);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [cinema, setCinema] = useState(false);
  const steps = useMemo(() => buildDemoReplay(data.nodes), [data]);
  const [replaying, setReplaying] = useState(autoPlay);
  const [playing, setPlaying] = useState(autoPlay);
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const visible = useMemo(
    () =>
      new Set(
        replaying && steps.length
          ? steps[Math.min(step, steps.length - 1)].nodeIds
          : data.nodes.map((n) => n.id),
      ),
    [data, replaying, steps, step],
  );
  useEffect(() => {
    if (!playing || !replaying || !steps.length) return;
    if (step >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((s) => s + 1), 3500);
    return () => window.clearTimeout(timer);
  }, [playing, replaying, step, steps, run]);
  useEffect(() => {
    setStep(0);
    setReplaying(autoPlay);
    setPlaying(autoPlay);
  }, [data, autoPlay]);
  useEffect(() => {
    if (!replaying || !steps.length) return;
    const timer = window.setTimeout(() => {
      const shown = data.nodes.filter(
        (n) => visible.has(n.id) && Number.isFinite(n.x),
      );
      if (!shown.length) return;
      const center = { x: 0, y: 0, z: 0 };
      for (const n of shown) {
        center.x += n.x / shown.length;
        center.y += n.y / shown.length;
        center.z += n.z / shown.length;
      }
      const spread = Math.max(
        ...shown.map((n) =>
          Math.hypot(n.x - center.x, n.y - center.y, n.z - center.z),
        ),
      );
      graph.current?.cameraPosition(
        { x: center.x, y: center.y, z: center.z + Math.max(180, spread * 2.7) },
        center,
        reduced ? 0 : 900,
      );
    }, 80);
    return () => window.clearTimeout(timer);
  }, [replaying, visible, data, steps, reduced, run]);
  function restart() {
    setSelected(null);
    setQuery("");
    setStep(0);
    setReplaying(true);
    setPlaying(true);
    setRun((r) => r + 1);
    graph.current?.zoomToFit(reduced ? 0 : 600, 70);
  }

  useEffect(() => {
    const obs = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    if (container.current) obs.observe(container.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    setSelected(null);
  }, [data]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCinema(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  function focus(node: any) {
    setPlaying(false);
    setReplaying(false);
    setSelected(node);
    const distance = 220;
    const norm = Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0) || 1;
    graph.current?.cameraPosition(
      {
        x: (node.x ?? 0) * (1 + distance / norm),
        y: (node.y ?? 0) * (1 + distance / norm),
        z: (node.z ?? 0) * (1 + distance / norm),
      },
      node,
      reduced ? 0 : 800,
    );
  }
  const nodeLabel = (n: any) => {
    if (!replaying && n.type !== "account" && n.caseIds.length < 2)
      return new Object3D();
    const label = new SpriteText(n.label);
    label.color = colors[n.type];
    label.textHeight = 3;
    label.position.y = 7;
    label.backgroundColor = "rgba(16,33,57,0.7)";
    label.padding = 1.5;
    label.borderRadius = 2;
    return label;
  };
  const found = data.nodes.filter((n) =>
    (n.label + " " + n.type).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className={"graph-shell " + (cinema ? "cinema" : "")} ref={container}>
      <div className="graph-tools">
        <span className="graph-tag">
          <i /> Relationship explorer <small>3D</small>
        </span>
        <div>
          <button
            className="icon dark"
            aria-label="Reset graph camera"
            onClick={() => graph.current?.zoomToFit(600, 45)}
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="icon dark"
            aria-label={cinema ? "Exit cinema view" : "Open cinema view"}
            onClick={() => setCinema(!cinema)}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
      <div className="graph-search">
        <Search size={15} />
        <input
          aria-label="Search graph nodes"
          placeholder="Find an account, order, or connection…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query && (
        <div className="graph-results">
          {found.length ? (
            found.slice(0, 6).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  focus(n);
                  setQuery("");
                }}
              >
                <i style={{ background: colors[n.type] }} />
                {n.label}
                <small>{n.type}</small>
              </button>
            ))
          ) : (
            <p>No matching connections.</p>
          )}
        </div>
      )}
      {steps.length > 0 && (
        <div className="replay-controls">
          <button
            className="replay-play"
            aria-label={playing ? "Pause graph replay" : "Play graph replay"}
            onClick={() => {
              if (playing) setPlaying(false);
              else if (!replaying || step === steps.length - 1) restart();
              else setPlaying(true);
            }}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
            {playing ? "Pause" : "Play demo"}
          </button>
          <button aria-label="Restart graph replay" onClick={restart}>
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setReplaying(false);
            }}
          >
            Show full map
          </button>
        </div>
      )}
      {replaying && steps.length > 0 && (
        <div className="replay-caption" role="status" aria-live="polite">
          <small>
            RELATIONSHIP REPLAY · {step + 1} / {steps.length}
            {!playing && step < steps.length - 1 ? " · PAUSED" : ""}
          </small>
          <strong>{steps[step].title}</strong>
          <p>{steps[step].detail}</p>
          <div className="replay-progress">
            {steps.map((s, i) => (
              <span key={s.title} className={i <= step ? "revealed" : ""} />
            ))}
          </div>
        </div>
      )}
      {!data.nodes.length ? (
        <div className="graph-empty">
          Your relationship map starts with your first event.
        </div>
      ) : (
        <GraphBoundary>
          <ForceGraph3D
            ref={graph}
            width={width}
            height={cinema ? window.innerHeight - 30 : 490}
            graphData={data}
            nodeVisibility={(n: any) => visible.has(n.id)}
            linkVisibility={(l: any) => linkIsVisible(l, visible)}
            backgroundColor="#102139"
            showNavInfo={false}
            nodeColor={(n: any) => colors[n.type]}
            nodeLabel={() => ""}
            nodeVal={(n: any) =>
              n.type === "account" ? 6 : n.type === "claim" ? 4 : 2.5
            }
            nodeResolution={16}
            nodeThreeObject={nodeLabel}
            nodeThreeObjectExtend={true}
            warmupTicks={100}
            cooldownTicks={replaying || reduced ? 1 : 160}
            linkColor={(l: any) =>
              selected &&
              ((l.source.id ?? l.source) === selected.id ||
                (l.target.id ?? l.target) === selected.id)
                ? "#b6dbff"
                : "rgba(151,181,218,0.4)"
            }
            linkWidth={(l: any) =>
              selected &&
              ((l.source.id ?? l.source) === selected.id ||
                (l.target.id ?? l.target) === selected.id)
                ? 1.5
                : 0.7
            }
            linkOpacity={0.45}
            linkDirectionalParticles={0}
            onNodeClick={focus}
            onBackgroundClick={() => setSelected(null)}
            onEngineStop={() => {}}
            enableNodeDrag={false}
          />
        </GraphBoundary>
      )}
      {selected && (
        <div className="node-card">
          <small style={{ color: colors[selected.type] }}>
            {selected.type}
          </small>
          <strong>{selected.label}</strong>
          <p>
            {selected.caseIds.length} linked{" "}
            {selected.caseIds.length === 1 ? "case" : "cases"} · highest score{" "}
            {selected.score}
          </p>
          {selected.caseIds.slice(0, 4).map((id: string, i: number) => (
            <button key={id} onClick={() => onCase(id)}>
              Open linked case {i + 1} →
            </button>
          ))}
        </div>
      )}
      <div className="graph-bottom">
        <div className="legend">
          {Object.entries(colors).map(([type, color]) => (
            <span key={type}>
              <i style={{ background: color }} />
              {type}
            </span>
          ))}
        </div>
        <span>Drag to orbit · scroll to zoom</span>
      </div>
      <details className="node-directory">
        <summary>Accessible node list · {visible.size} nodes</summary>
        <div>
          {found
            .filter((n) => visible.has(n.id))
            .map((n) => (
              <button key={n.id} onClick={() => focus(n)}>
                {n.type}: {n.label} ({n.caseIds.length} cases)
              </button>
            ))}
        </div>
      </details>
    </div>
  );
}
