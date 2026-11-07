import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { env } from "./env.ts";
import { HttpError, sendJson } from "./http.ts";
import { isAllowed, listCommunities, getCommunity } from "./communities.ts";

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: "Unexpected error." });
  }
});

async function route(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (method === "GET" && path === "/health") {
    sendJson(response, 200, {
      service: "sanctum-reddit",
      subreddits: env.subreddits,
      credentialsConfigured: Boolean(env.redditClientId && env.redditClientSecret)
    });
    return;
  }

  if (method === "GET" && path === "/communities") {
    sendJson(response, 200, { communities: await listCommunities() });
    return;
  }

  const match = path.match(/^\/communities\/([^/]+)$/);
  if (method === "GET" && match) {
    const name = decodeURIComponent(match[1] ?? "");
    if (!isAllowed(name)) {
      throw new HttpError(404, "That subreddit is not on the Sanctum allowlist.");
    }
    sendJson(response, 200, await getCommunity(name));
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

server.listen(env.port, () => {
  console.log(`sanctum-reddit listening on ${env.port}`);
});
