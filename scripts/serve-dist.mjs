import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "0.0.0.0";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.resolve(root, `.${requestedPath}`);

  if (!fullPath.startsWith(root)) {
    return path.join(root, "index.html");
  }

  return fullPath;
}

async function readAsset(filePath) {
  try {
    const fileStat = await stat(filePath);

    if (fileStat.isFile()) {
      return { filePath, body: await readFile(filePath) };
    }
  } catch {
    // SPA fallback below.
  }

  const fallbackPath = path.join(root, "index.html");
  return { filePath: fallbackPath, body: await readFile(fallbackPath) };
}

const server = createServer(async (request, response) => {
  try {
    const filePath = resolveRequestPath(request.url || "/");
    const asset = await readAsset(filePath);
    const contentType = contentTypes.get(path.extname(asset.filePath)) || "application/octet-stream";

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(asset.body);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Internal server error");
  }
});

server.listen(port, host, () => {
  console.log(`HortiGiro preview running on http://${host}:${port}`);
});
