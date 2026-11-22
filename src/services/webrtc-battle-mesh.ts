export class WebRtcBattleMesh {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onKeystrokeSync?: (data: any) => void;

  constructor(onKeystrokeSync?: (data: any) => void) {
    this.onKeystrokeSync = onKeystrokeSync;
  }

  public initializePeer(isInitiator: boolean, onSignal: (signal: any) => void) {
    if (typeof window === 'undefined') return;

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onSignal({ type: 'candidate', candidate: event.candidate });
      }
    };

    if (isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('battle-keystrokes', {
        ordered: false, // Low-latency UDP semantics
        maxRetransmits: 0,
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      if (this.onKeystrokeSync) {
        try {
          this.onKeystrokeSync(JSON.parse(event.data));
        } catch {}
      }
    };
  }

  public sendKeystrokeP2P(data: any): boolean {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
      return true;
    }
    return false;
  }
}
