import http from "http";

import { fetchNpmPackageVersion } from "./services.js";

class BassaResponse extends http.ServerResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locals?: Map<string, any>;
}

/**
 * Handle incoming requests
 * @param req
 * @param res
 */
export async function control(req: http.IncomingMessage, res: BassaResponse) {
  if (res.locals == null) {
    res.locals = new Map();
  }
  res.locals?.set("tick", Date.now());
  console.log(res.locals);
  if (req.method !== "GET" || req.url == null) {
    return handleInvalidRequest(res);
  }
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;
  const packages = requestUrl.searchParams.get("packages");

  if (packages == null || pathname !== "/versions") {
    return handleInvalidRequest(res);
  }

  const packageList = packages.split(",");

  const versions: Record<string, string> = {};

  for (const packageName of packageList) {
    if (packageName.length > 0) {
      versions[packageName] = await fetchNpmPackageVersion(packageName);
    }
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      response: versions,
      tick: getTick(res),
    }),
  );
}

/**
 * Handle invalid request
 * @param res
 */
function handleInvalidRequest(res: BassaResponse) {
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      error: "Invalid request",
      tick: getTick(res),
    }),
  );
}

/**
 *
 * @param res
 */
function getTick(res: BassaResponse) {
  return res.locals?.get("tick") != null
    ? Date.now() - res.locals.get("tick")
    : null;
}
