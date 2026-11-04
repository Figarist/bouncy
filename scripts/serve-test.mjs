#!/usr/bin/env node

/**
 * scripts/serve-test.mjs
 * Lightweight standalone local HTTP server for testing 'Тихий клас' offline or in production build.
 * Zero external dependencies — uses only Node.js standard library.
 *
 * Usage:
 *   node scripts/serve-test.mjs              # Serves dist/ at http://localhost:5173/?debug and opens browser
 *   node scripts/serve-test.mjs --port=8080  # Custom port
 *   node scripts/serve-test.mjs --no-open    # Do not auto-open browser
 *   node scripts/serve-test.mjs --dev        # Run Vite dev server instead
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, exec, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');

const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const noOpen = args.includes('--no-open');
const noDebug = args.includes('--no-debug');
const portArg = args.find((a) => a.startsWith('--port='));
let defaultPort = portArg ? parseInt(portArg.split('=')[1], 10) : 5173;

if (isDev) {
  const viteArgs = ['vite'];
  if (!noOpen) {
    viteArgs.push('--open', noDebug ? '/' : '/?debug');
  }
  console.log('⚡ Запуск Vite dev-сервера...');
  const child = spawn('npx', viteArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  startStaticServer();
}

function startStaticServer() {
  if (!fs.existsSync(distDir)) {
    console.log('📦 Папка dist/ відсутня. Виконуємо збірку (npm run build)...');
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Помилка збірки dist:', err.message);
      process.exit(1);
    }
  }

  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    // Only accept GET and HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let reqPath = decodeURIComponent(parsedUrl.pathname);

    // Prevent directory traversal
    const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(distDir, safePath);

    // Check if target exists and if directory, serve index.html
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
    } catch {
      // Fallback
    }

    // SPA fallback: if file does not exist, serve index.html
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Помилка сервера: ${err.message}`);
        return;
      }

      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      };

      // Service worker headers
      if (ext === '.webmanifest') {
        headers['Content-Type'] = 'application/manifest+json; charset=utf-8';
      } else if (path.basename(filePath) === 'sw.js') {
        headers['Service-Worker-Allowed'] = '/';
      }

      res.writeHead(200, headers);
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(content);
      }
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Порт ${defaultPort} зайнятий, пробуємо ${defaultPort + 1}...`);
      defaultPort++;
      server.listen(defaultPort);
    } else {
      console.error('❌ Помилка сервера:', err);
      process.exit(1);
    }
  });

  server.listen(defaultPort, () => {
    const query = noDebug ? '' : '?debug';
    const targetUrl = `http://localhost:${defaultPort}/${query}`;
    console.log(`\n======================================================`);
    console.log(`🟢 Тестовий сервер «Тихий клас» запущено!`);
    console.log(`📍 Адреса: \x1b[36m${targetUrl}\x1b[0m`);
    console.log(`📁 Роздається папка: ${distDir}`);
    console.log(`⚙️  Режим симулятора шуму: ${noDebug ? 'вимкнено' : 'активовано (?debug)'}`);
    console.log(`   (Натисніть Ctrl+C для зупинки сервера)`);
    console.log(`======================================================\n`);

    if (!noOpen) {
      openBrowser(targetUrl);
    }
  });
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd = '';
  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, () => {});
}
