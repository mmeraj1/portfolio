import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

interface Props { before: string; after: string; beforeLabel?: string; afterLabel?: string }

export default function ImageComparisonSlider({ before, after, beforeLabel = 'Original', afterLabel = 'Enhanced' }: Props) {
  const [position, setPosition] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const update = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); update(e.clientX); };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e.clientX); };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 5));
    if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 5));
  };

  return (
    <div className="pj-compare" ref={ref} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
      <img src={after} alt={afterLabel} draggable={false} />
      <img className="pj-compare-before" src={before} alt={beforeLabel} draggable={false} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} />
      <span className="pj-compare-tag pj-compare-tag-l">{beforeLabel}</span>
      <span className="pj-compare-tag pj-compare-tag-r">{afterLabel}</span>
      <div className="pj-compare-handle" style={{ left: `${position}%` }} role="slider" tabIndex={0} aria-label="Before and after comparison" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position)} onKeyDown={onKeyDown}><span>⇆</span></div>
    </div>
  );
}
