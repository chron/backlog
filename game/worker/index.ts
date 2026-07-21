import { handleTelemetryRequest } from "../functions/api/telemetry";

const telemetryPath = "/api/telemetry";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === telemetryPath) {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Method not allowed." },
          { status: 405, headers: { Allow: "POST" } },
        );
      }
      return handleTelemetryRequest(request, env.TELEMETRY_DB);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
