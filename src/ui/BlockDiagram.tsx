import type { Architecture } from "../types";
import { findRectifier } from "../library";

export function BlockDiagram({ arch }: { arch: Architecture }) {
  const rect = findRectifier(arch.rectifierId);
  const blocks = [
    { id: "ac", title: "AC", sub: "mains" },
    { id: "xf", title: "Xfmr", sub: "Vsec" },
    { id: "rect", title: rect.kind === "tube-fwct" ? "Valve" : rect.kind === "ic-ideal-bridge" ? "IC rect" : "Bridge", sub: rect.mpn },
    ...arch.stages.map((s) => ({
      id: s.id,
      title:
        s.type === "cap" ? "C" : s.type === "resistor" ? "R" : s.type === "choke" ? "L" : "Reg",
      sub:
        s.type === "cap"
          ? `${s.C_uF}µF`
          : s.type === "resistor"
            ? `${s.R_ohm}Ω`
            : s.type === "choke"
              ? s.L_mH >= 1000
                ? `${s.L_mH / 1000}H`
                : `${s.L_mH}mH`
              : `${s.vset}V`,
    })),
    { id: "load", title: "Load", sub: "Iload" },
  ];

  const w = 92;
  const gap = 28;
  const width = 40 + blocks.length * (w + gap);
  const y = 36;

  return (
    <div className="panel schematic">
      <h2>Architecture</h2>
      <svg viewBox={`0 0 ${width} 96`} role="img" aria-label="PSU block diagram">
        {blocks.map((b, i) => {
          const x = 16 + i * (w + gap);
          const next = 16 + (i + 1) * (w + gap);
          return (
            <g key={b.id}>
              <rect
                x={x}
                y={y - 22}
                width={w}
                height={44}
                rx={10}
                fill="#14110e"
                stroke={i === 2 ? "#e8a04a" : "#3b342c"}
              />
              <text x={x + w / 2} y={y - 4} textAnchor="middle" fill="#f3eadc" fontSize="12">
                {b.title}
              </text>
              <text x={x + w / 2} y={y + 12} textAnchor="middle" fill="#a3947d" fontSize="9">
                {b.sub}
              </text>
              {i < blocks.length - 1 && (
                <path
                  d={`M ${x + w} ${y} H ${next}`}
                  stroke="#e8a04a"
                  strokeWidth="1.4"
                  fill="none"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
