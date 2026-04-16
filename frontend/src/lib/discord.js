import { DiscordSDK } from "@discord/embedded-app-sdk";

const DISCORD_CLIENT_ID = process.env.REACT_APP_DISCORD_CLIENT_ID;

/** True when running inside a Discord Activity iframe */
export const isDiscordEmbed = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    return (
      params.has("frame_id") ||
      params.has("instance_id") ||
      params.has("platform") ||
      window.self !== window.top
    );
  } catch {
    return true;
  }
})();

let discordSdk = null;
let discordUser = null;
let setupComplete = false;

export async function setupDiscord() {
  if (setupComplete) return { sdk: discordSdk, user: discordUser };
  if (!DISCORD_CLIENT_ID) {
    console.warn("REACT_APP_DISCORD_CLIENT_ID not set");
    return { sdk: null, user: null };
  }

  discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"],
  });

  const apiBase = isDiscordEmbed ? "/.proxy" : (process.env.REACT_APP_BACKEND_URL || "");
  const res = await fetch(`${apiBase}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const { access_token } = await res.json();

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
