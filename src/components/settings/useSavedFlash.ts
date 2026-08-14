import { useCallback, useRef, useState } from "react";

/** Flips `saved` true for `duration` ms after `flash()` is called, for a transient "Saved" confirmation. */
export function useSavedFlash(duration = 2200) {
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const flash = useCallback(() => {
    setSaved(true);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => setSaved(false), duration);
  }, [duration]);

  return [saved, flash] as const;
}
