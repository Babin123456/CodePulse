export interface DirectorTelemetry {
  userId: string;
  username: string;
  cpm: number;
  testCasesPassed: number;
  totalTestCases: number;
  timeRemainingSeconds: number;
  recentErrorCount: number;
}

export interface DirectorFocusDecision {
  focusedUserId: string;
  focusReason: string;
  hypeScore: number;
}

export function evaluateDirectorFocus(
  players: DirectorTelemetry[],
  manualOverrideUserId?: string,
): DirectorFocusDecision {
  if (manualOverrideUserId) {
    return {
      focusedUserId: manualOverrideUserId,
      focusReason: 'Manual Director Override',
      hypeScore: 100,
    };
  }

  if (!players || players.length === 0) {
    return {
      focusedUserId: '',
      focusReason: 'No players active',
      hypeScore: 0,
    };
  }

  let highestHype = -1;
  let chosenPlayer = players[0];
  let reason = 'Active development';

  for (const player of players) {
    let hype = 0;

    // 1. Passing tests close to victory (e.g. 4/5)
    if (player.totalTestCases > 0 && player.testCasesPassed === player.totalTestCases - 1) {
      hype += 50;
      reason = 'Match point! Passing final test case!';
    } else {
      hype += (player.testCasesPassed / (player.totalTestCases || 1)) * 30;
    }

    // 2. High typing speed (CPM)
    if (player.cpm > 250) {
      hype += 25;
      if (hype > highestHype) reason = `Rapid code burst (${player.cpm} CPM)`;
    }

    // 3. Clutch time pressure (< 30s remaining)
    if (player.timeRemainingSeconds > 0 && player.timeRemainingSeconds < 30) {
      hype += 20;
      if (hype > highestHype) reason = 'Final seconds countdown!';
    }

    if (hype > highestHype) {
      highestHype = hype;
      chosenPlayer = player;
    }
  }

  return {
    focusedUserId: chosenPlayer.userId,
    focusReason: reason,
    hypeScore: Number(highestHype.toFixed(1)),
  };
}
