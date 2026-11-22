import { Injectable, Logger } from '@nestjs/common';

export interface PrReviewRequest {
  prNumber: number;
  diffContent: string;
  filesChanged: string[];
}

export interface ReviewComment {
  path: string;
  line: number;
  suggestion: string;
  severity: 'INFO' | 'WARNING' | 'BLOCKER';
}

export interface PrReviewResponse {
  prNumber: number;
  approved: boolean;
  score: number;
  comments: ReviewComment[];
  suggestedFixCommit?: string;
}

@Injectable()
export class PrReviewerService {
  private readonly logger = new Logger(PrReviewerService.name);

  public async reviewPullRequest(request: PrReviewRequest): Promise<PrReviewResponse> {
    const { prNumber, diffContent, filesChanged } = request;
    const comments: ReviewComment[] = [];

    // Analyze diff lines for common pitfalls
    const lines = diffContent.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('console.log(')) {
        comments.push({
          path: filesChanged[0] || 'src/app.ts',
          line: idx + 1,
          suggestion: 'Replace raw console.log with structured Logger instance.',
          severity: 'WARNING',
        });
      }
      if (line.includes(': any') && !line.includes('// eslint-disable')) {
        comments.push({
          path: filesChanged[0] || 'src/app.ts',
          line: idx + 1,
          suggestion: 'Avoid explicit "any" typing; define a typed interface.',
          severity: 'INFO',
        });
      }
    });

    const blockerCount = comments.filter((c) => c.severity === 'BLOCKER').length;
    const approved = blockerCount === 0;

    return {
      prNumber,
      approved,
      score: Math.max(0, 100 - comments.length * 10),
      comments,
      suggestedFixCommit: approved ? 'chore(ci): auto-fix code style formatting' : undefined,
    };
  }
}
