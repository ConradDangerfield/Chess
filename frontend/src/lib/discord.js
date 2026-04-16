import { DiscordSDK } from "@discord/embedded-app-sdk";

const DISCORD_CLIENT_ID = process.env.REACT_APP_DISCORD_CLIENT_ID;

/** True when running inside a Discord Activity iframe */
export const isDiscordEmbed = (() => {
  try {
    // Discord Activities load inside a nested iframe with specific search params
    const params = new URLSearchParams(window.location.search);
    return (
      params.has("frame_id") ||
      params.has("instance_id") ||
      params.has("platform") ||
      window.self !== window.top
    );
  } catch {
    // cross-origin iframe access throws — that means we're embedded
    return true;
  }
})();

let discordSdk = null;
let discordUser = null;
let setupComplete = false;

/**
 * Initialise the Discord SDK, run OAuth, return the authenticated user.
 * Safe to call multiple times — subsequent calls return the cached result.
 */
export async function setupDiscord() {
  if (setupComplete) return { sdk: discordSdk, user: discordUser };
  if (!DISCORD_CLIENT_ID) {
    console.warn("REACT_APP_DISCORD_CLIENT_ID not set — skipping Discord SDK");
    return { sdk: null, user: null };
  }

  discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);

  // Wait for the SDK to connect to the Discord client
  await discordSdk.ready();

  // Request OAuth authorization (opens modal inside Discord)
  const { code } = await discordSdk.commands.authorize({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"],
  });

  // Exchange the code for an access_token via our backend
  const apiBase = isDiscordEmbed ? "/.proxy" : (process.env.REACT_APP_BACKEND_URL || "");
  const res = await fetch(`${apiBase}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const { access_token } = await res.json();

  // Authenticate with Discord
  const auth = await discordSdk.commands.authenticate({ access_token });
  discordUser = auth.user;
  setupComplete = true;

  return { sdk: discordSdk, user: discordUser };
}

export function getDiscordSdk() {
  return discordSdk;
}

export function getDiscordUser() {
  return discordUser;
}
