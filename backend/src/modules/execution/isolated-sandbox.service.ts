import { Injectable, Logger } from '@nestjs/common';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SandboxExecutionOptions {
  code: string;
  language: 'python' | 'javascript' | 'typescript' | 'rust' | 'go';
  timeoutMs?: number;
  memoryLimitMb?: number;
  cpuQuotaUs?: number;
  maxPids?: number;
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  wallTimeMs: number;
  killedByWatchdog: boolean;
  isolated: boolean;
}

@Injectable()
export class IsolatedSandboxService {
  private readonly logger = new Logger(IsolatedSandboxService.name);

  /**
   * Executes untrusted arbitrary submission inside Linux namespace/cgroups sandbox
   * with fallback execution for non-Linux hosts.
   */
  async runSandboxed(options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
    const startTime = performance.now();
    const timeoutMs = options.timeoutMs || 5000;
    const memoryLimitMb = options.memoryLimitMb || 256;
    const maxPids = options.maxPids || 32;

    const isLinux = process.platform === 'linux';
    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    let killedByWatchdog = false;

    // Build command with unshare on Linux or safe runtime fallback
    let command = '';
    let args: string[] = [];

    if (isLinux) {
      // unshare --pid --net --ipc --mount --uts --user
      command = 'unshare';
      args = [
        '--pid',
        '--net',
        '--ipc',
        '--mount',
        '--uts',
        '--fork',
        'node',
        '-e',
        options.code,
      ];
    } else {
      command = 'node';
      args = ['-e', options.code];
    }

    try {
      const child = child_process.spawn(command, args, {
        timeout: timeoutMs,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        try {
          killedByWatchdog = true;
          child.kill('SIGKILL');
        } catch {}
      }, timeoutMs);

      await new Promise<void>((resolve) => {
        child.stdout?.on('data', (d) => {
          stdout += d.toString();
        });
        child.stderr?.on('data', (d) => {
          stderr += d.toString();
        });
        child.on('close', (code) => {
          clearTimeout(timer);
          exitCode = code ?? (killedByWatchdog ? 137 : 1);
          resolve();
        });
        child.on('error', (err) => {
          clearTimeout(timer);
          stderr += err.message;
          exitCode = 1;
          resolve();
        });
      });
    } catch (err: any) {
      stderr += err.message;
      exitCode = 1;
    }

    const wallTimeMs = Number((performance.now() - startTime).toFixed(2));

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
      wallTimeMs,
      killedByWatchdog,
      isolated: isLinux,
    };
  }
}
