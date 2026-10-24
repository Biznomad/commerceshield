import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { Object3D } from "three";
import { Search, Maximize2, RotateCcw } from "lucide-react";
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
}: {
  data: { nodes: any[]; links: any[] };
  onCase: (id: string) => void;
}) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const container = useRef<HTMLDivElement>(null);
  const graph = useRef<any>(null);
  const [width, setWidth] = useState(800);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [cinema, setCinema] = useState(false);
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
    if (n.type !== "account" && n.caseIds.length < 2) return new Object3D();
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
      {!data.nodes.length ? (
        <div className="graph-empty">
          Your relationship map starts with your first event.
        </div>
      ) : (
        <GraphBoundary>
          <ForceGraph3D
            ref={graph}
            width={width}
            height={cinema ? window.innerHeight - 140 : 490}
            graphData={data}
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
            cooldownTicks={reduced ? 1 : 160}
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
        <summary>Accessible node list · {data.nodes.length} nodes</summary>
        <div>
          {found.map((n) => (
            <button key={n.id} onClick={() => focus(n)}>
              {n.type}: {n.label} ({n.caseIds.length} cases)
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
