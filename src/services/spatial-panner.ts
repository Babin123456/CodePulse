export class SpatialPannerEngine {
  private audioCtx: AudioContext | null = null;
  private pannerNodes: Map<string, PannerNode> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
  }

  public getOrCreatePanner(userId: string): PannerNode | null {
    if (!this.audioCtx) return null;
    let panner = this.pannerNodes.get(userId);
    if (!panner) {
      panner = this.audioCtx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      panner.connect(this.audioCtx.destination);
      this.pannerNodes.set(userId, panner);
    }
    return panner;
  }

  public updatePlayerPosition(userId: string, x: number, y: number, z: number) {
    const panner = this.getOrCreatePanner(userId);
    if (panner) {
      if (panner.positionX) {
        panner.positionX.setValueAtTime(x, this.audioCtx!.currentTime);
        panner.positionY.setValueAtTime(y, this.audioCtx!.currentTime);
        panner.positionZ.setValueAtTime(z, this.audioCtx!.currentTime);
      } else {
        // Fallback
        (panner as any).setPosition(x, y, z);
      }
    }
  }

  public isVoiceActive(rmsVolume: number, threshold: number = 0.015): boolean {
    return rmsVolume > threshold;
  }
}
