import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger index; each step delays the reveal by 70ms. */
  index?: number;
  id?: string;
  labelledBy?: string;
}

/** Fades content up once as it enters the viewport. Content stays visible without JS or IntersectionObserver. */
export default function Reveal({ children, as: Tag = 'div', className = '', index = 0, id, labelledBy }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); observer.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style = { '--reveal-delay': `${Math.min(index, 6) * 70}ms` } as CSSProperties;
  return <Tag ref={ref} id={id} aria-labelledby={labelledBy} className={`reveal${shown ? ' reveal-in' : ''} ${className}`.trim()} style={style}>{children}</Tag>;
}
