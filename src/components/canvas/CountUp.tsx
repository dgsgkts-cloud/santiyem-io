// CountUp — small opt-in animated number. Not injected into AIKpiCards to
// keep the renderer untouched; available for future use.

import { useEffect, useRef, useState } from "react";

export const CountUp = ({
  value,
  duration = 220,
  format = (n: number) => n.toLocaleString("tr-TR"),
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) => {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = performance.now();
    const startVal = from.current;
    const delta = value - startVal;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(startVal + delta * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const rounded = Math.abs(value % 1) < 0.001 ? Math.round(display) : Math.round(display * 100) / 100;
  return <>{format(rounded)}</>;
};

export default CountUp;
