/**
 * The decision tree as a navigable graph.
 *
 * Layout comes from `buildTree` (layered, deterministic, RTL: the opening scene
 * is on the right and every transition moves left).
 *
 * The graph also shows the *rules* inside the tree, so a branch can be judged
 * without opening every choice:
 *
 * - a **dashed** edge belongs to a conditional choice;
 * - a **red** dashed edge is conditional *and* shut with the story's starting
 *   values — the most likely content mistake, visible at a glance;
 * - a small diamond on an edge means the choice changes state when taken;
 * - node badges count a scene's gated choices, effectful choices and timed
 *   decision.
 */
import type { StoryTree, TreeNode } from './model';

interface StoryTreeViewProps {
  readonly tree: StoryTree;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  /** Scene ids whose timed decision is live, for a marker on the node. */
  readonly timedSceneIds: ReadonlySet<string>;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 74;

function nodeClass(node: TreeNode, selected: boolean): string {
  const parts = [`tree-node`, `tree-node--${node.kind}`];
  if (selected) {
    parts.push('is-selected');
  }
  if (node.timed) {
    parts.push('is-timed');
  }
  return parts.join(' ');
}

function edgeClass(kind: string, gated: boolean, openAtStart: boolean): string {
  const parts = ['tree-edge', `tree-edge--${kind}`];
  if (gated) {
    parts.push('tree-edge--gated');
    if (!openAtStart) {
      parts.push('tree-edge--closed');
    }
  }
  return parts.join(' ');
}

export function StoryTreeView({
  tree,
  selectedId,
  onSelect,
  timedSceneIds,
}: StoryTreeViewProps): React.ReactElement {
  const positions = new Map(tree.nodes.map((node) => [node.id, node]));

  const width = Math.max(...tree.nodes.map((node) => node.x), 0) + NODE_WIDTH + 80;
  const height = Math.max(...tree.nodes.map((node) => node.y), 0) + NODE_HEIGHT + 80;

  return (
    <>
      <div className="tree-scroll" dir="rtl">
        <svg
          className="tree-canvas"
          width={Math.max(width, 640)}
          height={Math.max(height, 420)}
          role="img"
          aria-label={`درخت تصمیم داستان: ${tree.nodes.length} گره، ${tree.edges.length} پیوند، ${tree.stats.gatedEdges} شرطی و ${tree.stats.closedAtStart} بسته در شروع`}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
            <marker id="arrow-gated" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" opacity="0.75" />
            </marker>
          </defs>

          <g transform="translate(40, 40)">
            {tree.edges.map((edge) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);
              if (from === undefined || to === undefined) {
                return null;
              }
              // A transition moves to the left, so edges leave the left edge of the
              // source box and arrive at the right edge of the target box.
              const x1 = from.x;
              const y1 = from.y + NODE_HEIGHT / 2;
              const x2 = to.x + NODE_WIDTH;
              const y2 = to.y + NODE_HEIGHT / 2;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              return (
                <g key={`${edge.from}->${edge.to}:${edge.choiceId}`} className={edgeClass(edge.kind, edge.gated, edge.openAtStart)}>
                  <path
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={edge.gated ? 2 : 1.5}
                    strokeDasharray={edge.gated ? '5 4' : undefined}
                    markerEnd={edge.gated ? 'url(#arrow-gated)' : 'url(#arrow)'}
                  />
                  {edge.effects > 0 && (
                    <path
                      d={`M ${midX} ${midY - 4} L ${midX + 4} ${midY} L ${midX} ${midY + 4} L ${midX - 4} ${midY} Z`}
                      className="tree-edge__effect"
                    />
                  )}
                  <title>
                    {edge.label}
                    {edge.gated ? ' · شرطی' : ''}
                    {edge.gated && !edge.openAtStart ? ' · در شروع بسته' : ''}
                    {edge.effects > 0 ? ` · ${edge.effects} اثر` : ''}
                  </title>
                </g>
              );
            })}

            {tree.nodes.map((node) => {
              const x = node.x;
              const selected = selectedId === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${node.y})`}
                  className={nodeClass(node, selected)}
                  onClick={() => onSelect(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(node.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected}
                  aria-label={`${node.title}${node.gatedChoices > 0 ? ` — ${node.gatedChoices} شرطی` : ''}${node.choicesWithEffects > 0 ? ` — ${node.choicesWithEffects} اثرگذار` : ''}`}
                >
                  <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={10} className="tree-node__box" />
                  {/* foreignObject, not <text>: it clips and ellipsises Persian text
                      correctly in both directions. */}
                  <foreignObject width={NODE_WIDTH} height={NODE_HEIGHT} pointerEvents="none">
                    <div className="tree-node__label">
                      <div className="tree-node__title">{node.title}</div>
                      <div className="tree-node__meta">
                        {node.kind === 'scene' ? node.id : node.kind === 'ending' ? 'پایان' : 'شکست'}
                        {timedSceneIds.has(node.id) ? ' · زمان‌دار' : ''}
                      </div>
                      {node.kind === 'scene' && (node.gatedChoices > 0 || node.choicesWithEffects > 0) && (
                        <div className="tree-node__badges">
                          {node.gatedChoices > 0 && (
                            <span className="badge badge--gated" title={`${node.gatedChoices} گزینهٔ شرطی`}>
                              ⛓ {node.gatedChoices}
                            </span>
                          )}
                          {node.choicesWithEffects > 0 && (
                            <span className="badge badge--effect" title={`${node.choicesWithEffects} گزینه اثرگذار`}>
                              ◆ {node.choicesWithEffects}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="tree-legend" aria-hidden="true">
        <span className="tree-legend__item">
          <svg width="26" height="8" viewBox="0 0 26 8"><line x1="0" y1="4" x2="26" y2="4" stroke="#4a5a6d" strokeWidth="1.5" /></svg>
          ساده
        </span>
        <span className="tree-legend__item">
          <svg width="26" height="8" viewBox="0 0 26 8"><line x1="0" y1="4" x2="26" y2="4" stroke="#c8873c" strokeWidth="2" strokeDasharray="5 4" /></svg>
          شرطی (باز)
        </span>
        <span className="tree-legend__item">
          <svg width="26" height="8" viewBox="0 0 26 8"><line x1="0" y1="4" x2="26" y2="4" stroke="#b4544a" strokeWidth="2" strokeDasharray="5 4" /></svg>
          شرطی (در شروع بسته)
        </span>
        <span className="tree-legend__item">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1 L11 6 L6 11 L1 6 Z" fill="#7fb98a" /></svg>
          گزینه‌ای که وضعیت را عوض می‌کند
        </span>
        <span className="tree-legend__count">
          {tree.stats.gatedEdges} شرطی · {tree.stats.closedAtStart} بسته در شروع ·{' '}
          {tree.stats.effectfulEdges} اثرگذار · {tree.stats.timedScenes} زمان‌دار
          {tree.stats.unreachableScenes > 0 ? ` · ${tree.stats.unreachableScenes} دست‌نیافتنی` : ''}
        </span>
      </div>
    </>
  );
}
