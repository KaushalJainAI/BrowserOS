import { useEffect, useRef, type RefObject } from 'react';

/**
 * A ref that always holds the most recent value, updated in an effect.
 *
 * The point is to let long-lived subscribers — socket handlers, key listeners,
 * `requestAnimationFrame` loops — read current props without listing them as
 * effect dependencies, which would tear the subscription down and rebuild it on
 * every unrelated render.
 *
 * The assignment happens in an effect rather than during render: a render can
 * be thrown away or replayed, and mutating a ref on a discarded render leaves
 * the ref describing a state that never committed. Effects only run for commits,
 * so by the time any handler can fire, the ref matches what is on screen.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
