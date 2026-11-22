export interface KeystrokeEventSample {
  key: string;
  dwellTime: number; // keydown to keyup in ms
  flightTime: number; // previous keyup to this keydown in ms
  timestamp: number;
}

export interface BiometricsPayload {
  battleId: string;
  userId: string;
  samples: KeystrokeEventSample[];
  pasteEvents: Array<{
    linesCount: number;
    charCount: number;
    timestamp: number;
  }>;
}

export class BiometricsTracker {
  private activeKeyDowns: Map<string, number> = new Map();
  private lastKeyUpTimestamp: number = 0;
  private samples: KeystrokeEventSample[] = [];
  private pasteEvents: Array<{ linesCount: number; charCount: number; timestamp: number }> = [];
  private isListening: boolean = false;
  private battleId: string;
  private userId: string;
  private onFlush?: (payload: BiometricsPayload) => void;
  private intervalTimer?: any;

  constructor(battleId: string, userId: string, onFlush?: (payload: BiometricsPayload) => void) {
    this.battleId = battleId;
    this.userId = userId;
    this.onFlush = onFlush;
  }

  public start() {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;

    window.addEventListener('keydown', this.handleKeyDown, { passive: true });
    window.addEventListener('keyup', this.handleKeyUp, { passive: true });
    window.addEventListener('paste', this.handlePaste, { passive: true });

    // Flush metrics periodically every 5 seconds
    this.intervalTimer = setInterval(() => {
      this.flush();
    }, 5000);
  }

  public stop() {
    if (!this.isListening || typeof window === 'undefined') return;
    this.isListening = false;

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('paste', this.handlePaste);

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
    this.flush();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const now = performance.now();
    if (!this.activeKeyDowns.has(e.code)) {
      this.activeKeyDowns.set(e.code, now);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const now = performance.now();
    const keyDownTime = this.activeKeyDowns.get(e.code);
    if (keyDownTime !== undefined) {
      this.activeKeyDowns.delete(e.code);
      const dwellTime = Math.max(0, now - keyDownTime);
      const flightTime = this.lastKeyUpTimestamp > 0 ? Math.max(0, keyDownTime - this.lastKeyUpTimestamp) : 0;
      this.lastKeyUpTimestamp = now;

      this.samples.push({
        key: e.key.length === 1 ? 'char' : e.key,
        dwellTime: Number(dwellTime.toFixed(2)),
        flightTime: Number(flightTime.toFixed(2)),
        timestamp: Date.now(),
      });

      if (this.samples.length >= 100) {
        this.flush();
      }
    }
  };

  private handlePaste = (e: ClipboardEvent) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    const lines = pastedText.split('\n').length;
    this.pasteEvents.push({
      linesCount: lines,
      charCount: pastedText.length,
      timestamp: Date.now(),
    });

    if (lines >= 20) {
      this.flush();
    }
  };

  public flush() {
    if (this.samples.length === 0 && this.pasteEvents.length === 0) return;

    const payload: BiometricsPayload = {
      battleId: this.battleId,
      userId: this.userId,
      samples: [...this.samples],
      pasteEvents: [...this.pasteEvents],
    };

    this.samples = [];
    this.pasteEvents = [];

    if (this.onFlush) {
      this.onFlush(payload);
    }
  }
}
