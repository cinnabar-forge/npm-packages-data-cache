import fs from "fs/promises";
import http from "http";
import path from "path";

import {
  fetchNpmPackageVersion,
  generateStaticSite,
  getHtmlUpdateAwaited,
  setHtmlUpdateAwaited,
} from "./services.js";

type BassaResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locals?: Map<string, any>;
} & http.ServerResponse;

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
  if (req.method !== "GET" || req.url == null) {
    return handleInvalidRequest(res, 404, "Not found");
  }
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;

  if (pathname === "/") {
    if (getHtmlUpdateAwaited()) {
      await generateStaticSite();
      setHtmlUpdateAwaited(false);
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(await fs.readFile(path.resolve("./tmp/index.html")));
    return;
  }
  if (pathname !== "/versions") {
    return handleInvalidRequest(res, 404, "Not found");
  }

  const packages = requestUrl.searchParams.get("packages");

  if (packages == null) {
    return handleInvalidRequest(res, 400, "No packages specified");
  }

  const packageList = packages.split(",");

  const versions: Record<string, string> = {};

  for (const packageName of packageList) {
    if (packageName.length > 0) {
      try {
        versions[packageName] = await fetchNpmPackageVersion(
          packageName,
          "api",
        );
      } catch {
        // return handleInvalidRequest(res, 400, "Invalid package name");
      }
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
 * @param statusCode
 * @param message
 */
function handleInvalidRequest(
  res: BassaResponse,
  statusCode?: number,
  message?: string,
) {
  res.writeHead(statusCode || 500, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      error: message || "Unknown error",
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
