import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const host = "127.0.0.1";
const port = 4173;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function filePathFromUrl(urlPath) {
  if (urlPath === "/" || urlPath === "") {
    return path.join(__dirname, "index.html");
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(__dirname, safePath);
}

const server = http.createServer((request, response) => {
  const urlPath = request.url ? request.url.split("?")[0] : "/";
  const filePath = filePathFromUrl(urlPath);

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    const contentType = contentTypes[extension] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  });
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log(`Green Paradise is running at ${url}`);
  exec(`open "${url}"`);
});
