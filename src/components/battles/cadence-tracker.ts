export interface CadenceTensorSample {
  dwellTimeMs: number;
  flightTimeMs: number;
  timestamp: number;
}

export class CadenceTracker {
  private activeKeyDownMap: Map<string, number> = new Map();
  private lastKeyUp: number = 0;
  private samples: CadenceTensorSample[] = [];
  private onTensorDump?: (tensor: number[][]) => void;

  constructor(onTensorDump?: (tensor: number[][]) => void) {
    this.onTensorDump = onTensorDump;
  }

  public registerKeyDown(code: string) {
    const now = performance.now();
    if (!this.activeKeyDownMap.has(code)) {
      this.activeKeyDownMap.set(code, now);
    }
  }

  public registerKeyUp(code: string) {
    const now = performance.now();
    const downTime = this.activeKeyDownMap.get(code);
    if (downTime !== undefined) {
      this.activeKeyDownMap.delete(code);
      const dwell = Math.max(0, now - downTime);
      const flight = this.lastKeyUp > 0 ? Math.max(0, downTime - this.lastKeyUp) : 0;
      this.lastKeyUp = now;

      this.samples.push({
        dwellTimeMs: dwell,
        flightTimeMs: flight,
        timestamp: Date.now(),
      });

      if (this.samples.length >= 50) {
        this.emitTensor();
      }
    }
  }

  public emitTensor() {
    if (this.samples.length === 0) return;
    // Format 2D tensor: [ [dwell, flight], ... ]
    const tensor = this.samples.map((s) => [
      Number(s.dwellTimeMs.toFixed(2)),
      Number(s.flightTimeMs.toFixed(2)),
    ]);
    this.samples = [];

    if (this.onTensorDump) {
      this.onTensorDump(tensor);
    }
  }
}
