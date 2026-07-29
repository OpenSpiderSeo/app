/** Module-level abort + run generation for QuickStart (survives panel remount). */
let abortRequested = false;
let runGeneration = 0;

export function requestQuickStartAbort(): void {
  abortRequested = true;
}

export function beginQuickStartRun(): number {
  abortRequested = false;
  runGeneration += 1;
  return runGeneration;
}

/** Invalidate in-flight runs on project switch (keeps abort flagged). */
export function invalidateQuickStartRuns(): void {
  abortRequested = true;
  runGeneration += 1;
}

/** True while this run is still the active generation (abort may be requested). */
export function isQuickStartGeneration(generation: number): boolean {
  return generation === runGeneration;
}

/** True if the run should keep going (same generation and not aborted). */
export function isQuickStartRunCurrent(generation: number): boolean {
  return generation === runGeneration && !abortRequested;
}
