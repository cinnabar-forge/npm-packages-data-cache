import fs from "fs";
import path from "path";

import { PackageInfo } from "./types.js";

/**
 *
 * @param data
 */
export function generateStaticSiteHtml(data: PackageInfo[]): void {
  const apiHost =
    process.env.API_HOST || `http://localhost:${process.env.PORT || 3000}`;
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NPM Packages Data Cache</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        h1 {
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
        }
    </style>
</head>
<body>
    <h1>NPM Packages Data Cache</h1>
    <p>A <a href="https://github.com/cinnabar-forge">Cinnabar Forge</a> project. Host your own <a href="https://github.com/cinnabar-forge/npm-packages-data-cache">copy</a>.</p>
    <code>API Example: <a href="${apiHost}/versions?packages=clivo,express,svelte">${apiHost}/versions?packages=clivo,express,svelte</a></code>
    <table>
        <thead>
            <tr>
                <th>Package</th>
                <th>Version</th>
                <th>Last Check</th>
            </tr>
        </thead>
        <tbody>
            ${data
              .map(
                (item) => `
            <tr>
                <td>${item.package} [<span><a href="https://www.npmjs.com/package/${item.package}">npm</a></span>]</td>
                <td>${item.version}</td>
                <td>${new Date(Number(item.lastCheck)).toISOString()}</td>
            </tr>`,
              )
              .join("")}
        </tbody>
    </table>
</body>
</html>
`;

  fs.writeFileSync(path.resolve("tmp", "index.html"), htmlContent, "utf8");
}
