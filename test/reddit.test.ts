import assert from "node:assert/strict";
import { test } from "node:test";

process.env.REDDIT_CLIENT_ID = "client";
process.env.REDDIT_CLIENT_SECRET = "secret";
process.env.REDDIT_USER_AGENT = "web:sanctum-community:v1.0 (by /u/test)";
process.env.REDDIT_SUBREDDITS = "sanctumhermeticum,otherexample";
process.env.REDDIT_CACHE_SECONDS = "60";

const { resetAuthForTests, getAccessToken, getSubredditAbout } = await import("../src/reddit.ts");
const { resetCacheForTests, isAllowed, getCommunity, listCommunities } = await import("../src/communities.ts");

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("allowlist rejects names that are not configured", () => {
  assert.equal(isAllowed("sanctumhermeticum"), true);
  assert.equal(isAllowed("r/OtherExample"), true);
  assert.equal(isAllowed("askreddit"), false);
});

test("application-only OAuth and /about map public fields only", async () => {
  resetAuthForTests();
  resetCacheForTests();
  const calls: string[] = [];

  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url === "https://www.reddit.com/api/v1/access_token") {
      return jsonResponse(200, { access_token: "token", expires_in: 3600 });
    }
    if (url === "https://oauth.reddit.com/r/sanctumhermeticum/about") {
      return jsonResponse(200, {
        kind: "t5",
        data: {
          display_name: "SanctumHermeticum",
          title: "Sanctum Hermeticum",
          public_description: "A room for slow reading.",
          subscribers: 1200,
          active_user_count: 14,
          community_icon: "https://styles.redditmedia.com/icon.png?width=256",
          url: "/r/SanctumHermeticum/"
        }
      });
    }
    return jsonResponse(404, {});
  }) as typeof fetch;

  try {
    const token = await getAccessToken();
    assert.equal(token, "token");
    const community = await getSubredditAbout("sanctumhermeticum");
    assert.equal(community.name, "SanctumHermeticum");
    assert.equal(community.subscribers, 1200);
    assert.equal(community.iconUrl, "https://styles.redditmedia.com/icon.png");
    assert.equal(community.url, "https://www.reddit.com/r/SanctumHermeticum/");
    assert.deepEqual(calls, [
      "https://www.reddit.com/api/v1/access_token",
      "https://oauth.reddit.com/r/sanctumhermeticum/about"
    ]);
  } finally {
    globalThis.fetch = original;
  }
});

test("listCommunities stays on the allowlist and uses the cache", async () => {
  resetAuthForTests();
  resetCacheForTests();
  let aboutCalls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/access_token")) {
      return jsonResponse(200, { access_token: "token", expires_in: 3600 });
    }
    aboutCalls += 1;
    const name = url.split("/r/")[1]?.split("/")[0];
    return jsonResponse(200, {
      kind: "t5",
      data: { display_name: name, title: name, public_description: "", subscribers: 1, url: `/r/${name}/` }
    });
  }) as typeof fetch;

  try {
    const first = await listCommunities();
    const second = await getCommunity("sanctumhermeticum");
    assert.equal(first.length, 2);
    assert.equal(second.name, first[0]?.name);
    assert.equal(aboutCalls, 2);
    await assert.rejects(() => getCommunity("askreddit"), /allowlist/);
  } finally {
    globalThis.fetch = original;
  }
});
