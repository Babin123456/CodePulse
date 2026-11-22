import { Injectable, Logger } from '@nestjs/common';

export interface AuditEventRecord {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  sequenceNumber: number;
  timestampMs: number;
}

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private events: Map<string, AuditEventRecord[]> = new Map(); // aggregateId -> events

  public appendEvent(
    aggregateId: string,
    eventType: string,
    payload: any,
  ): AuditEventRecord {
    const list = this.events.get(aggregateId) || [];
    const record: AuditEventRecord = {
      eventId: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      aggregateId,
      eventType,
      payload,
      sequenceNumber: list.length + 1,
      timestampMs: Date.now(),
    };
    list.push(record);
    this.events.set(aggregateId, list);
    return record;
  }

  public getEventsUntil(aggregateId: string, targetTimestampMs: number): AuditEventRecord[] {
    const list = this.events.get(aggregateId) || [];
    return list.filter((e) => e.timestampMs <= targetTimestampMs);
  }
}
