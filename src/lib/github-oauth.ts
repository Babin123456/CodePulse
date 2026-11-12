export function beginGitHubOAuth(): void {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  if (!clientId) {
    return;
  }

  const state = crypto.randomUUID();
  sessionStorage.setItem("github_oauth_state", state);
  const params = new URLSearchParams({ client_id: clientId, state });
  window.location.assign(`https://github.com/login/oauth/authorize?${params}`);
}
