import { signal } from '@angular/core';

/**
 * Fake progress that smoothly increases from 0 to ~90%, then jumps to 100% on complete.
 * Steps: 0% → 15% → 35% → 55% → 70% → 80% → 85% → 88% → 90% (slows down as it approaches 90%)
 */
export function useFakeProgress() {
  const percent = signal(0);
  let timerId: ReturnType<typeof setInterval> | null = null;

  function start() {
    stop();
    percent.set(0);
    let elapsed = 0;
    timerId = setInterval(() => {
      elapsed += 300;
      const p = percent();
      if (p < 15) {
        percent.set(Math.min(15, p + 5));
      } else if (p < 50) {
        percent.set(Math.min(50, p + 3));
      } else if (p < 75) {
        percent.set(Math.min(75, p + 2));
      } else if (p < 90) {
        percent.set(Math.min(90, p + 1));
      }
      // Stays at 90 until complete() is called
    }, 300);
  }

  function complete() {
    stop();
    percent.set(100);
  }

  function stop() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function reset() {
    stop();
    percent.set(0);
  }

  return { percent, start, complete, reset };
}
