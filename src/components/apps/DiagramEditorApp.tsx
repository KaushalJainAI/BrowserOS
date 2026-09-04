/** FlowForge — a node-and-edge diagram editor with draggable nodes. */

import { useCallback, useRef, useState } from 'react';
import { Plus, Trash2, Save, Link2, MousePointer2, Download } from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { vfs, HOME, join } from '../../os/vfs';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'start' | 'process' | 'decision' | 'end';
}

interface Edge {
  id: string;
  from: string;
  to: string;
}

const KINDS: Record<Node['kind'], { fill: string; label: string }> = {
  start: { fill: '#10b981', label: 'Start' },
  process: { fill: '#6366f1', label: 'Process' },
  decision: { fill: '#f59e0b', label: 'Decision' },
  end: { fill: '#ef4444', label: 'End' },
};

// Stable empty defaults: a fresh `[]` in the fallback branch would change
// identity on every render and defeat the memoization of everything below.
const NO_NODES: Node[] = [];
const NO_EDGES: Edge[] = [];

const NODE_WIDTH = 132;
const NODE_HEIGHT = 48;

export default function DiagramEditorApp() {
  const { notify } = useOSActions();
  const { state, setState } = useWindowState({
    nodes: [
      { id: 'n1', label: 'Trigger', x: 80, y: 80, kind: 'start' },
      { id: 'n2', label: 'Process data', x: 300, y: 180, kind: 'process' },
      { id: 'n3', label: 'Valid?', x: 540, y: 90, kind: 'decision' },
    ] as Node[],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
    ] as Edge[],
  });

  const nodes = Array.isArray(state.nodes) ? (state.nodes as Node[]) : NO_NODES;
  const edges = Array.isArray(state.edges) ? (state.edges as Edge[]) : NO_EDGES;

  const [selected, setSelected] = useState<string | null>(null);
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const addNode = useCallback((kind: Node['kind']) => {
    const id = `n_${Date.now()}`;
    setState({
      nodes: [...nodes, {
        id,
        label: KINDS[kind].label,
        // Stagger placement so a burst of additions doesn't stack in one spot.
        x: 120 + (nodes.length % 5) * 60,
        y: 120 + (nodes.length % 4) * 70,
        kind,
      }],
    });
    setSelected(id);
  }, [nodes, setState]);

  const removeNode = useCallback((id: string) => {
    setState({
      nodes: nodes.filter((node) => node.id !== id),
      // Edges referencing a removed node would render as dangling lines.
      edges: edges.filter((edge) => edge.from !== id && edge.to !== id),
    });
    setSelected(null);
  }, [nodes, edges, setState]);

  const startDrag = useCallback((event: React.PointerEvent, node: Node) => {
    event.stopPropagation();
    setSelected(node.id);
    if (linkingFrom) {
      if (linkingFrom !== node.id) {
        const exists = edges.some((edge) => edge.from === linkingFrom && edge.to === node.id);
        if (!exists) {
          setState({ edges: [...edges, { id: `e_${Date.now()}`, from: linkingFrom, to: node.id }] });
        }
      }
      setLinkingFrom(null);
      return;
    }

    const surface = surfaceRef.current?.getBoundingClientRect();
    if (!surface) return;
    const offsetX = event.clientX - surface.left - node.x;
    const offsetY = event.clientY - surface.top - node.y;

    // Commit on pointer-up only: writing window state on every move would
    // persist to storage at pointer rate.
    let latest = { x: node.x, y: node.y };
    const preview = event.currentTarget as HTMLElement;

    const onMove = (moveEvent: PointerEvent) => {
      latest = {
        x: Math.max(0, moveEvent.clientX - surface.left - offsetX),
        y: Math.max(0, moveEvent.clientY - surface.top - offsetY),
      };
      preview.style.transform = `translate(${latest.x}px, ${latest.y}px)`;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setState({
        nodes: nodes.map((entry) => (entry.id === node.id ? { ...entry, ...latest } : entry)),
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [nodes, edges, linkingFrom, setState]);

  const save = useCallback(() => {
    const path = vfs.uniquePath(join(`${HOME}/Documents`, 'diagram.json'));
    vfs.write(path, JSON.stringify({ nodes, edges }, null, 2));
    notify({ message: `Saved diagram to ${path}.`, type: 'success' });
  }, [nodes, edges, notify]);

  const selectedNode = nodes.find((node) => node.id === selected) ?? null;

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        {(Object.keys(KINDS) as Array<Node['kind']>).map((kind) => (
          <button
            key={kind}
            onClick={() => addNode(kind)}
            className="os-row w-auto flex-none px-2.5 py-1.5 text-[12px] font-medium"
          >
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: KINDS[kind].fill }} />
            {KINDS[kind].label}
          </button>
        ))}

        <span className="w-px h-5 bg-[var(--os-border)] mx-1" />

        <button
          onClick={() => setLinkingFrom(linkingFrom ? null : selected)}
          disabled={!selected && !linkingFrom}
          data-active={Boolean(linkingFrom)}
          className="os-button gap-2"
          title="Select a node, click Connect, then click its target"
        >
          {linkingFrom ? <MousePointer2 size={14} /> : <Link2 size={14} />}
          {linkingFrom ? 'Pick target…' : 'Connect'}
        </button>
        <button
          onClick={() => selected && removeNode(selected)}
          disabled={!selected}
          className="os-icon-button"
          aria-label="Delete node"
        >
          <Trash2 size={15} />
        </button>

        <span className="flex-1" />

        <button onClick={save} className="os-icon-button" aria-label="Save diagram" title="Save as JSON">
          <Save size={15} />
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = window.document.createElement('a');
            anchor.href = url;
            anchor.download = 'diagram.json';
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          className="os-icon-button"
          aria-label="Download diagram"
        >
          <Download size={15} />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <div
          ref={surfaceRef}
          className="flex-1 relative overflow-auto min-w-0"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--os-border) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
          onPointerDown={() => { setSelected(null); setLinkingFrom(null); }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1400, minHeight: 900 }}>
            <defs>
              <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--os-text-dim)" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const from = nodes.find((node) => node.id === edge.from);
              const to = nodes.find((node) => node.id === edge.to);
              if (!from || !to) return null;
              const x1 = from.x + NODE_WIDTH / 2;
              const y1 = from.y + NODE_HEIGHT / 2;
              const x2 = to.x + NODE_WIDTH / 2;
              const y2 = to.y + NODE_HEIGHT / 2;
              // Horizontal control points give the familiar flowchart curve.
              const midX = (x1 + x2) / 2;
              return (
                <path
                  key={edge.id}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--os-text-dim)"
                  strokeWidth="1.8"
                  markerEnd="url(#flow-arrow)"
                />
              );
            })}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.id}
              onPointerDown={(event) => startDrag(event, node)}
              className="absolute top-0 left-0 flex items-center gap-2 px-3 rounded-xl cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                background: 'var(--os-surface-solid)',
                border: `2px solid ${selected === node.id ? 'var(--os-accent)' : KINDS[node.kind].fill}`,
                boxShadow: 'var(--os-shadow-soft)',
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: KINDS[node.kind].fill }} />
              <span className="text-[12px] font-medium truncate">{node.label}</span>
            </div>
          ))}
        </div>

        {selectedNode && (
          <aside className="w-52 shrink-0 border-l border-[var(--os-border)] p-3 space-y-3 bg-[var(--os-surface-sunken)]">
            <div>
              <p className="os-field-label mb-1.5">Label</p>
              <input
                value={selectedNode.label}
                onChange={(event) => setState({
                  nodes: nodes.map((node) => (
                    node.id === selectedNode.id ? { ...node, label: event.target.value } : node
                  )),
                })}
                className="os-input text-[12px]"
                aria-label="Node label"
              />
            </div>
            <div>
              <p className="os-field-label mb-1.5">Type</p>
              <div className="space-y-1">
                {(Object.keys(KINDS) as Array<Node['kind']>).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => setState({
                      nodes: nodes.map((node) => (node.id === selectedNode.id ? { ...node, kind } : node)),
                    })}
                    data-active={selectedNode.kind === kind}
                    className="os-row py-1.5 text-[12px]"
                  >
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: KINDS[kind].fill }} />
                    {KINDS[kind].label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => removeNode(selectedNode.id)} className="os-button os-button--danger w-full gap-2">
              <Trash2 size={13} /> Delete node
            </button>
          </aside>
        )}
      </div>

      <div className="app-statusbar">
        <span>{nodes.length} nodes · {edges.length} connections</span>
        {linkingFrom && (
          <span className="ml-auto flex items-center gap-1.5" style={{ color: 'var(--os-accent)' }}>
            <Plus size={11} /> Click a node to connect
          </span>
        )}
      </div>
    </div>
  );
}
