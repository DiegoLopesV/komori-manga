import { useRef, type PointerEvent, type CSSProperties } from 'react';
import { geometryPath, type Page, type Element, type Asset } from './core';
export function Canvas({
  page,
  assets,
  selected,
  onSelect,
  onChange,
  visible,
  animated,
  transition = 'none',
  duration = 0,
  reduced = false,
}: {
  page: Page;
  assets: Asset[];
  selected?: string;
  onSelect?: (id: string) => void;
  onChange?: (element: Element) => void;
  visible?: Set<string>;
  animated?: Set<string>;
  transition?: string;
  duration?: number;
  reduced?: boolean;
}) {
  const root = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    id: string;
    point?: number;
    x: number;
    y: number;
    original: Element;
  } | null>(null);
  function coordinate(event: PointerEvent<SVGSVGElement>) {
    const bounds = root.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * page.width) / bounds.width,
      y: ((event.clientY - bounds.top) * page.height) / bounds.height,
    };
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current || !onChange) return;
    const position = coordinate(event),
      { original, point } = drag.current;
    if (point !== undefined) {
      const points = structuredClone(original.points);
      points[point] = {
        ...points[point],
        x: Math.max(0, Math.min(1, (position.x - original.x) / original.width)),
        y: Math.max(0, Math.min(1, (position.y - original.y) / original.height)),
      };
      onChange({ ...original, points });
    } else
      onChange({
        ...original,
        x: Math.round(original.x + position.x - drag.current.x),
        y: Math.round(original.y + position.y - drag.current.y),
      });
  }
  const asset = (id?: string) => assets.find((a) => a.id === id);
  return (
    <svg
      ref={root}
      className="page-canvas"
      viewBox={`0 0 ${page.width} ${page.height}`}
      aria-label="Manga page"
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <rect width={page.width} height={page.height} fill="#fffdf8" />
      {onChange && page.backgroundAssetId && (
        <image
          href={asset(page.backgroundAssetId)?.src}
          width={page.width}
          height={page.height}
          opacity=".25"
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      {page.elements
        .filter((e) => !visible || visible.has(e.id))
        .map((e) => {
          const file = asset(e.assetId),
            poster = asset(e.posterId),
            clip = `clip-${page.id}-${e.id}`;
          const path = geometryPath(e.points, e.width, e.height);
          const isAnimated = animated?.has(e.id) && !reduced;
          return (
            <g
              key={e.id}
              transform={`translate(${e.x} ${e.y})`}
              onPointerDown={(event) => {
                if (!onChange) return;
                event.stopPropagation();
                onSelect?.(e.id);
                const pos = coordinate(event as unknown as PointerEvent<SVGSVGElement>);
                drag.current = { id: e.id, x: pos.x, y: pos.y, original: structuredClone(e) };
                root.current?.setPointerCapture(event.pointerId);
              }}
              style={{ cursor: onSelect ? 'move' : undefined }}
            >
              <g
                className={isAnimated ? `reveal-${transition}` : undefined}
                style={
                  {
                    animationDuration: `${duration}ms`,
                    transformOrigin: `${e.width / 2}px ${e.height / 2}px`,
                  } as CSSProperties
                }
              >
                <defs>
                  <clipPath id={clip}>
                    <path d={path} />
                  </clipPath>
                </defs>
                {(e.kind === 'panel' || e.kind === 'image' || e.kind === 'video') && (
                  <>
                    <path d={path} fill={e.fill} />
                    {file && file.type === 'image' && (
                      <image
                        href={reduced && file.mime === 'image/gif' ? poster?.src : file.src}
                        x={e.pageImage ? -e.x + e.imageX : e.imageX}
                        y={e.pageImage ? -e.y + e.imageY : e.imageY}
                        width={(e.pageImage ? page.width : e.width) * e.imageScale}
                        height={(e.pageImage ? page.height : e.height) * e.imageScale}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#${clip})`}
                      />
                    )}
                    {file?.type === 'video' && (
                      <foreignObject width={e.width} height={e.height} clipPath={`url(#${clip})`}>
                        {reduced ? (
                          poster ? (
                            <img
                              src={poster.src}
                              alt={e.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="static-placeholder">{e.name}</div>
                          )
                        ) : (
                          <video
                            src={file.src}
                            poster={poster?.src}
                            autoPlay
                            muted
                            playsInline
                            loop={e.loop}
                            preload="metadata"
                            aria-label={e.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transform: `translate(${e.imageX}px,${e.imageY}px) scale(${e.imageScale})`,
                            }}
                          />
                        )}
                      </foreignObject>
                    )}
                    <path d={path} fill="none" stroke={e.stroke} strokeWidth={e.strokeWidth} />
                  </>
                )}
                {e.kind === 'bubble' && (
                  <>
                    <ellipse
                      cx={e.width / 2}
                      cy={e.height / 2}
                      rx={e.width / 2}
                      ry={e.height / 2 - 8}
                      fill={e.fill}
                      stroke={e.stroke}
                      strokeWidth={e.strokeWidth}
                    />
                    <path
                      d={`M ${e.width * 0.65} ${e.height - 18} l 8 30 l -32 -24`}
                      fill={e.fill}
                      stroke={e.stroke}
                      strokeWidth={e.strokeWidth}
                    />
                  </>
                )}
                {['bubble', 'text', 'sfx'].includes(e.kind) && (
                  <foreignObject width={e.width} height={e.height}>
                    <div
                      className={`canvas-text text-${e.kind}`}
                      style={{ fontSize: e.fontSize, color: e.stroke }}
                    >
                      {e.text}
                    </div>
                  </foreignObject>
                )}
              </g>
              {selected === e.id && onChange && (
                <>
                  <rect
                    width={e.width}
                    height={e.height}
                    fill="none"
                    stroke="#a34e34"
                    strokeWidth={2}
                    strokeDasharray="8 5"
                  />
                  {e.kind === 'panel' &&
                    e.points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x * e.width}
                        cy={p.y * e.height}
                        r={7}
                        fill="#a34e34"
                        stroke="white"
                        strokeWidth={2}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          drag.current = {
                            id: e.id,
                            point: i,
                            x: 0,
                            y: 0,
                            original: structuredClone(e),
                          };
                          root.current?.setPointerCapture(event.pointerId);
                        }}
                      />
                    ))}
                </>
              )}
            </g>
          );
        })}
    </svg>
  );
}
