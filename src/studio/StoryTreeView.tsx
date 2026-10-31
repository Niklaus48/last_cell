/**
 * The decision tree as a navigable graph.
 *
 * Layout comes from `buildTree` (layered, deterministic, RTL: the opening scene
 * is on the right and every transition moves left). Edges are labelled with the
 * choice that creates them, so the structure of the story can be read directly
 * from the picture, and clicking a node opens it in the editor.
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
const NODE_HEIGHT = 62;

function nodeClass(node: TreeNode): string {
  return `tree-node tree-node--${node.kind}`;
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
    // `dir="rtl"` puts the initial scroll position at the right edge, which is
    // where the story starts.
    <div className="tree-scroll" dir="rtl">
      <svg
        className="tree-canvas"
        width={Math.max(width, 640)}
        height={Math.max(height, 420)}
        role="img"
        aria-label={`درخت تصمیم داستان: ${tree.nodes.length} گره و ${tree.edges.length} پیوند`}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
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
            return (
              <g key={`${edge.from}->${edge.to}:${edge.choiceId}`} className={`tree-edge tree-edge--${edge.kind}`}>
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                />
                <title>{edge.label}</title>
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
                className={`${nodeClass(node)}${selected ? ' is-selected' : ''}`}
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
                aria-label={node.title}
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={10}
                  className="tree-node__box"
                />
                {/* foreignObject, not <text>: it clips and ellipsises Persian text
                    correctly in both directions. */}
                <foreignObject width={NODE_WIDTH} height={NODE_HEIGHT} pointerEvents="none">
                  <div className="tree-node__label">
                    <div className="tree-node__title">{node.title}</div>
                    <div className="tree-node__meta">
                      {node.kind === 'scene' ? node.id : node.kind === 'ending' ? 'پایان' : 'شکست'}
                      {timedSceneIds.has(node.id) ? ' · زمان‌دار' : ''}
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
