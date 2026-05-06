/**
 * D4 Builds Worker
 * GET  /builds        → load all builds
 * POST /builds        → save/update a build
 * DELETE /builds/:id  → delete a build
 *
 * KV Binding: D4BUILDS
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ── GET /builds ───────────────────────────────────────
    if (path === "/builds" && request.method === "GET") {
      try {
        const data = await env.D4BUILDS.get("builds");
        const builds = data ? JSON.parse(data) : [];
        return json({ builds });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // ── POST /builds ──────────────────────────────────────
    if (path === "/builds" && request.method === "POST") {
      try {
        const body = await request.json();

        // Bulk save
        if (body.builds && Array.isArray(body.builds)) {
          await env.D4BUILDS.put("builds", JSON.stringify(body.builds));
          return json({ ok: true, count: body.builds.length });
        }

        // Single upsert
        const { build } = body;
        if (!build || !build.id) return json({ error: "Invalid build" }, 400);

        const data = await env.D4BUILDS.get("builds");
        let builds = data ? JSON.parse(data) : [];
        const idx = builds.findIndex(b => b.id === build.id);
        if (idx >= 0) builds[idx] = build;
        else builds.push(build);

        await env.D4BUILDS.put("builds", JSON.stringify(builds));
        return json({ ok: true, build });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // ── DELETE /builds/:id ────────────────────────────────
    if (path.startsWith("/builds/") && request.method === "DELETE") {
      try {
        const id = decodeURIComponent(path.replace("/builds/", ""));
        const data = await env.D4BUILDS.get("builds");
        let builds = data ? JSON.parse(data) : [];
        builds = builds.filter(b => b.id !== id);
        await env.D4BUILDS.put("builds", JSON.stringify(builds));
        return json({ ok: true });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    return new Response("Not found", { status: 404, headers: CORS });
  }
};
