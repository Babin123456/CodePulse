export interface DatagramPacket {
  frameId: number;
  userId: string;
  keystroke: string;
  timestamp: number;
}

export class WebTransportClient {
  private transport: any = null;
  private isConnected: boolean = false;
  private url: string;
  private onDatagramReceived?: (data: DatagramPacket) => void;

  constructor(url: string, onDatagramReceived?: (data: DatagramPacket) => void) {
    this.url = url;
    this.onDatagramReceived = onDatagramReceived;
  }

  public async connect(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).WebTransport) {
      try {
        const WT = (window as any).WebTransport;
        this.transport = new WT(this.url);
        await this.transport.ready;
        this.isConnected = true;
        this.readDatagrams();
        return true;
      } catch {
        // Fallback to WSS
        this.isConnected = false;
        return false;
      }
    }
    return false;
  }

  private async readDatagrams() {
    if (!this.transport?.datagrams?.readable) return;
    const reader = this.transport.datagrams.readable.getReader();
    try {
      while (this.isConnected) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && this.onDatagramReceived) {
          const text = new TextDecoder().decode(value);
          this.onDatagramReceived(JSON.parse(text));
        }
      }
    } catch {}
  }

  public async sendDatagram(data: DatagramPacket): Promise<void> {
    if (!this.isConnected || !this.transport?.datagrams?.writable) return;
    const writer = this.transport.datagrams.writable.getWriter();
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    await writer.write(bytes);
    writer.releaseLock();
  }
}
