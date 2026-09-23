import type { CSSProperties } from "react";
import { formatAzn } from "@/lib/format";

interface Props {
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  tone: "original" | "replica" | "unknown";
}

function position(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

export function PriceStrip({ min, max, median, p25, p75, tone }: Props) {
  const style = {
    "--p25": `${position(p25, min, max)}%`,
    "--p75": `${position(p75, min, max)}%`,
    "--median": `${position(median, min, max)}%`,
  } as CSSProperties;

  const label = `Ən aşağı ${formatAzn(min)}, satıcıların əsas hissəsi ${formatAzn(p25)} ilə ${formatAzn(p75)} arasında, median ${formatAzn(median)}, ən yuxarı ${formatAzn(max)}`;

  return (
    <div className={`strip strip-${tone}`} style={style}>
      <div className="strip-track" role="img" aria-label={label}>
        <span className="strip-band" />
        <span className="strip-median" />
      </div>
      <div className="strip-ends" aria-hidden="true">
        <span>{formatAzn(min)}</span>
        <span>{formatAzn(max)}</span>
      </div>
    </div>
  );
}
