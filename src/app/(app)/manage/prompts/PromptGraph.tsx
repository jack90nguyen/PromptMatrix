"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import {
  categoryColor,
  TAG_COLOR,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from "@/lib/graph";
import { GraphControls } from "./GraphControls";

type SimNode = GraphNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & { kind: GraphLink["kind"] };

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

/**
 * Positions are written straight onto the DOM on every simulation tick rather
 * than through React state - re-rendering hundreds of nodes 60 times a second
 * is the one thing that makes this view stutter.
 *
 * TODO: SVG holds up to roughly 500 nodes. Beyond that this needs a canvas
 * renderer with manual hit-testing.
 */
export function PromptGraph({ data }: { data: GraphData }) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const nodeElements = useRef(new Map<string, SVGGElement>());
  const linkElements = useRef<Array<SVGLineElement | null>>([]);
  const simulationRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const transform = useRef({ x: 0, y: 0, k: 1 });
  const size = useRef({ width: 0, height: 0 });

  const [linkDistance, setLinkDistance] = useState(60);
  const [charge, setCharge] = useState(-220);
  const [showLabels, setShowLabels] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  const colorByCategory = useMemo(() => {
    const map = new Map<string, string>();
    data.nodes
      .filter((node) => node.kind === "category")
      .forEach((node, index) => map.set(node.categoryId!, categoryColor(index)));
    return map;
  }, [data.nodes]);

  const colorOf = useCallback(
    (node: GraphNode): string =>
      node.kind === "tag" ? TAG_COLOR : (colorByCategory.get(node.categoryId ?? "") ?? TAG_COLOR),
    [colorByCategory],
  );

  /** Node ids adjacent to the hovered one, plus itself. */
  const highlighted = useMemo(() => {
    if (!hovered) return null;
    const set = new Set<string>([hovered]);
    for (const link of data.links) {
      if (link.source === hovered) set.add(link.target);
      else if (link.target === hovered) set.add(link.source);
    }
    return set;
  }, [hovered, data.links]);

  const applyTransform = useCallback(() => {
    const { x, y, k } = transform.current;
    viewportRef.current?.setAttribute("transform", `translate(${x},${y}) scale(${k})`);
  }, []);

  // Build the simulation whenever the graph itself changes.
  useEffect(() => {
    const nodes: SimNode[] = data.nodes.map((node) => ({ ...node }));
    const links: SimLink[] = data.links.map((link) => ({ ...link }));

    const simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((node) => node.id)
          // Tags sit further out so category clusters stay readable.
          .distance((link) => (link.kind === "belongs" ? linkDistance : linkDistance * 1.6))
          .strength((link) => (link.kind === "belongs" ? 0.9 : 0.35)),
      )
      .force("charge", forceManyBody<SimNode>().strength((node) => charge - node.radius * 6))
      .force("collide", forceCollide<SimNode>((node) => node.radius + 6))
      .force("x", forceX(0).strength(0.03))
      .force("y", forceY(0).strength(0.03))
      // Keeps the barycentre on the origin, which the viewport translates to
      // the middle of the box. Rebuilding the simulation used to drop this.
      .force("center", forceCenter(0, 0));

    simulationRef.current = simulation;

    simulation.on("tick", () => {
      links.forEach((link, index) => {
        const element = linkElements.current[index];
        if (!element) return;
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        element.setAttribute("x1", String(source.x ?? 0));
        element.setAttribute("y1", String(source.y ?? 0));
        element.setAttribute("x2", String(target.x ?? 0));
        element.setAttribute("y2", String(target.y ?? 0));
      });
      nodes.forEach((node) => {
        nodeElements.current
          .get(node.id)
          ?.setAttribute("transform", `translate(${node.x ?? 0},${node.y ?? 0})`);
      });
    });

    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [data, linkDistance, charge]);

  // Keep the centre force on the middle of whatever space we were given.
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      size.current = { width: rect.width, height: rect.height };
      if (transform.current.x === 0 && transform.current.y === 0) {
        transform.current = { x: rect.width / 2, y: rect.height / 2, k: 1 };
        applyTransform();
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [applyTransform]);

  function screenToGraph(clientX: number, clientY: number) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const { x, y, k } = transform.current;
    return {
      x: ((clientX - (rect?.left ?? 0)) - x) / k,
      y: ((clientY - (rect?.top ?? 0)) - y) / k,
    };
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    const pointerX = event.clientX - (rect?.left ?? 0);
    const pointerY = event.clientY - (rect?.top ?? 0);
    const { x, y, k } = transform.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k * Math.pow(2, -event.deltaY / 400)));
    // Keep the point under the cursor fixed while scaling.
    transform.current = {
      k: next,
      x: pointerX - ((pointerX - x) / k) * next,
      y: pointerY - ((pointerY - y) / k) * next,
    };
    applyTransform();
  }

  function startPan(event: React.PointerEvent) {
    if (event.button !== 0) return;

    const origin = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      ...transform.current,
    };

    const move = (moveEvent: PointerEvent) => {
      transform.current = {
        k: origin.k,
        x: origin.x + (moveEvent.clientX - origin.pointerX),
        y: origin.y + (moveEvent.clientY - origin.pointerY),
      };
      applyTransform();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startDrag(event: React.PointerEvent, node: SimNode) {
    event.stopPropagation();
    const simulation = simulationRef.current;
    if (!simulation) return;
    const target = simulation.nodes().find((candidate) => candidate.id === node.id);
    if (!target) return;

    simulation.alphaTarget(0.25).restart();
    let moved = false;

    const move = (moveEvent: PointerEvent) => {
      moved = true;
      const point = screenToGraph(moveEvent.clientX, moveEvent.clientY);
      target.fx = point.x;
      target.fy = point.y;
    };
    const up = () => {
      simulation.alphaTarget(0);
      target.fx = null;
      target.fy = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) open(node);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function open(node: GraphNode) {
    if (node.kind === "prompt") router.push(`/manage/prompts/${node.refId}`);
    else if (node.kind === "category") router.push(`/manage/prompts?category=${node.refId}`);
    else router.push(`/manage/prompts?tags=${node.refId}`);
  }

  function resetZoom() {
    transform.current = { x: size.current.width / 2, y: size.current.height / 2, k: 1 };
    applyTransform();
    simulationRef.current?.alpha(0.4).restart();
  }

  const legend = useMemo(
    () =>
      data.nodes
        .filter((node) => node.kind === "category")
        .map((node, index) => ({
          label: node.label,
          count: node.degree,
          color: categoryColor(index),
          slug: node.refId,
        })),
    [data.nodes],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
      {/* On a narrow screen the graph comes first; the panel drops below it. */}
      <div className="order-2 lg:order-1">
        <GraphControls
          legend={legend}
          counts={data.counts}
          linkDistance={linkDistance}
          charge={charge}
          showLabels={showLabels}
          onLinkDistance={setLinkDistance}
          onCharge={setCharge}
          onShowLabels={setShowLabels}
          onReset={resetZoom}
        />
      </div>

      <div
        ref={wrapperRef}
        className="relative order-1 h-[calc(100vh-13rem)] min-h-[26rem] touch-none lg:order-2 overflow-hidden rounded-lg border border-line bg-surface/60"
        onWheel={handleWheel}
        onPointerDown={startPan}
      >
        {data.truncated && (
          <p className="absolute left-3 top-3 z-10 rounded border border-amber-800/70 bg-amber-950/60 px-2 py-1 font-mono text-[11px] text-amber-400">
            Showing {data.truncated.shown} of {data.truncated.total} prompts - narrow the filters
          </p>
        )}

        <svg className="size-full cursor-grab active:cursor-grabbing">
          <g ref={viewportRef}>
            <g>
              {data.links.map((link, index) => {
                const dim =
                  highlighted && !(highlighted.has(link.source) && highlighted.has(link.target));
                return (
                  <line
                    key={`${link.source}-${link.target}-${index}`}
                    ref={(element) => {
                      linkElements.current[index] = element;
                    }}
                    stroke={link.kind === "belongs" ? "#2c3f63" : "#1f3350"}
                    strokeWidth={link.kind === "belongs" ? 1.2 : 1}
                    strokeDasharray={link.kind === "tagged" ? "3 3" : undefined}
                    opacity={dim ? 0.12 : 1}
                  />
                );
              })}
            </g>

            <g>
              {data.nodes.map((node) => {
                const color = colorOf(node);
                const dim = highlighted && !highlighted.has(node.id);
                const labelled =
                  showLabels || node.kind !== "prompt" || hovered === node.id;

                return (
                  <g
                    key={node.id}
                    ref={(element) => {
                      if (element) nodeElements.current.set(node.id, element);
                      else nodeElements.current.delete(node.id);
                    }}
                    className="cursor-pointer"
                    opacity={dim ? 0.15 : 1}
                    onPointerDown={(event) => startDrag(event, node as SimNode)}
                    onPointerEnter={() => setHovered(node.id)}
                    onPointerLeave={() => setHovered((current) => (current === node.id ? null : current))}
                  >
                    {node.kind === "tag" ? (
                      <rect
                        x={-node.radius}
                        y={-node.radius}
                        width={node.radius * 2}
                        height={node.radius * 2}
                        transform="rotate(45)"
                        fill="none"
                        stroke={color}
                        strokeWidth={1.4}
                      />
                    ) : (
                      <circle
                        r={node.radius}
                        fill={color}
                        fillOpacity={node.isActive ? (node.kind === "category" ? 1 : 0.85) : 0.25}
                        stroke={node.isBase ? "#fbbf24" : "transparent"}
                        strokeWidth={node.isBase ? 2 : 0}
                      />
                    )}

                    {labelled && (
                      <text
                        x={node.radius + 5}
                        y={3.5}
                        className="pointer-events-none select-none font-mono"
                        fontSize={node.kind === "category" ? 10 : 8}
                        fill={node.kind === "category" ? "#dbe4f0" : "#7d8ba5"}
                      >
                        {node.label.length > 28 ? `${node.label.slice(0, 27)}...` : node.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
