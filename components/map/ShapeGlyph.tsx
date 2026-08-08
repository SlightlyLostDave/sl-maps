import type { CategoryShape } from "@/lib/map/categoryStyle";

const BASE = "inline-block h-2.5 w-2.5 shrink-0";

export default function ShapeGlyph({
  shape,
  color,
}: {
  shape: CategoryShape;
  color: string;
}) {
  switch (shape) {
    case "circle":
      return (
        <span className={`${BASE} rounded-full`} style={{ background: color }} />
      );
    case "square":
      return (
        <span className={`${BASE} rounded-[2px]`} style={{ background: color }} />
      );
    case "diamond":
      return (
        <span
          className={`${BASE} rounded-[2px] rotate-45`}
          style={{ background: color }}
        />
      );
    case "pentagon":
      return (
        <span
          className={BASE}
          style={{
            background: color,
            clipPath: "polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)",
          }}
        />
      );
    case "triangle":
      return (
        <span
          className={BASE}
          style={{
            background: color,
            clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
          }}
        />
      );
    case "hollow":
      return (
        <span
          className={`${BASE} rounded-full`}
          style={{ boxShadow: `inset 0 0 0 2px ${color}` }}
        />
      );
  }
}
