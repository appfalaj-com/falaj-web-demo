import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const serverDirectory = resolve("dist/server");
const serverEntry = resolve(serverDirectory, "index.js");

const workerSource = `export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response("Falaj assets binding is unavailable.", { status: 500 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") {
      return response;
    }

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (!acceptsHtml) {
      return response;
    }

    const fallbackUrl = new URL(request.url);
    fallbackUrl.pathname = "/";
    fallbackUrl.search = "";
    return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
  },
};
`;

await mkdir(serverDirectory, { recursive: true });
await writeFile(serverEntry, workerSource, "utf8");
