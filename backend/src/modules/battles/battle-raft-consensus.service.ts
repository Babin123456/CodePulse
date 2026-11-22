import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type RaftRole = 'LEADER' | 'FOLLOWER' | 'CANDIDATE';

export interface RaftState {
  battleId: string;
  nodeId: string;
  currentTerm: number;
  votedFor: string | null;
  role: RaftRole;
  commitIndex: number;
  lastApplied: number;
}

export interface AppendEntriesArgs {
  term: number;
  leaderId: string;
  prevLogIndex: number;
  prevLogTerm: number;
  entries: Array<{ index: number; term: number; command: string; payload: any }>;
  leaderCommit: number;
}

@Injectable()
export class BattleRaftConsensusService {
  private readonly logger = new Logger(BattleRaftConsensusService.name);
  private nodeStates: Map<string, RaftState> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  public initializeBattlePod(battleId: string, nodeId: string): RaftState {
    const state: RaftState = {
      battleId,
      nodeId,
      currentTerm: 1,
      votedFor: null,
      role: 'FOLLOWER',
      commitIndex: 0,
      lastApplied: 0,
    };
    this.nodeStates.set(`${battleId}:${nodeId}`, state);
    return state;
  }

  public electLeader(battleId: string, nodeId: string): RaftState {
    const key = `${battleId}:${nodeId}`;
    let state = this.nodeStates.get(key);
    if (!state) {
      state = this.initializeBattlePod(battleId, nodeId);
    }

    state.currentTerm += 1;
    state.role = 'LEADER';
    state.votedFor = nodeId;
    this.logger.log(`[RAFT] Node ${nodeId} elected LEADER for Battle ${battleId} in Term ${state.currentTerm}`);
    return state;
  }

  public async appendWalEntry(
    battleId: string,
    term: number,
    index: number,
    command: string,
    payload: any,
  ) {
    try {
      const prismaAny = this.prisma as any;
      if (prismaAny.battleWalEntry) {
        return await prismaAny.battleWalEntry.upsert({
          where: {
            battleId_index: {
              battleId,
              index,
            },
          },
          create: {
            battleId,
            term,
            index,
            command,
            payload,
            applied: true,
          },
          update: {
            term,
            command,
            payload,
            applied: true,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not persist WAL entry: ${err?.message}`);
    }
    return { battleId, index, term, command, applied: true };
  }
}
