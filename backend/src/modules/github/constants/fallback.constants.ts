/**
 * Last-resort payloads for the GitHub proxy: used only when GitHub is
 * failing AND there is no stale copy to serve. They are placeholders, not
 * real data, and responses carrying them are flagged `stale: true` with
 * `fallbackSource: 'mock'`.
 */
export const GITHUB_FALLBACK = {
  PROFILE: (username: string) => ({
    id: null,
    username,
    name: username,
    avatarUrl: null,
    htmlUrl: `https://github.com/${username}`,
    bio: '',
    company: null,
    location: null,
    blog: null,
    twitterUsername: null,
    publicRepos: 0,
    publicGists: 0,
    followers: 0,
    following: 0,
    createdAt: null,
    updatedAt: null,
  }),
  DEVELOPER: (username: string) => ({
    username,
    score: 0,
    stats: {
      totalCommits: 0,
      totalPRs: 0,
      totalIssues: 0,
      totalStars: 0,
      publicRepos: 0,
    },
  }),
  REPOS: () => [] as unknown[],
  EVENTS: () => [] as unknown[],
};
