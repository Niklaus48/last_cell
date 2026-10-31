/**
 * Development-only write API for the story studio.
 *
 * The studio needs to save two things: the content pack (one JSON file) and
 * uploaded media (images, audio). Doing that in the browser alone would mean
 * downloading a file and asking the user to move it — so this plugin adds three
 * tiny endpoints while `vite dev` is running:
 *
 *   GET  /__studio/pack            → current pack file (or the empty pack)
 *   POST /__studio/pack            → validate + write the pack file
 *   POST /__studio/upload          → write one media file into public/assets
 *
 * SAFETY
 * - Registered only for the dev server (`apply: 'serve'`), never in a build.
 * - Every write path is resolved and checked to be inside the project root, with
 *   a fixed allowlist of directories and a sanitised file name.
 * - The pack is validated with the same validator the game uses, so a rejected
 *   payload is never written: the game keeps running on its previous content.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join, resolve, sep } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

const PACK_PATH = 'src/story/content/chapter1/studio.pack.json';

const IMAGE_DIR = 'public/assets/scenes/chapter-1';
const AUDIO_DIR = 'public/assets/audio/chapter-1';

const FILE_SAFE = /^[a-z0-9][a-z0-9-]*\.(webp|jpg|jpeg|png|mp3|ogg|wav|m4a|opus)$/;

type JsonObject = Readonly<Record<string, unknown>>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = chunk as Uint8Array;
    total += buffer.length;
    if (total > 8 * 1024 * 1024) {
      throw new Error('payload too large');
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function insideProject(root: string, target: string): boolean {
  const normalisedRoot = resolve(root) + sep;
  return resolve(target).startsWith(normalisedRoot);
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

export function studioApi(): Plugin {
  let root = process.cwd();

  return {
    name: 'last-cell-studio-api',
    apply: 'serve',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use((request: IncomingMessage, response: ServerResponse, next: () => void) => {
        const url = request.url ?? '';
        if (!url.startsWith('/__studio/')) {
          next();
          return;
        }

        void (async () => {
          const packFile = join(root, PACK_PATH);

          if (request.method === 'GET' && url === '/__studio/pack') {
            try {
              const text = await readFile(packFile, 'utf8');
              const parsed: unknown = JSON.parse(text);
              send(response, 200, { ok: true, pack: parsed });
            } catch {
              send(response, 200, { ok: true, pack: null });
            }
            return;
          }

          if (request.method === 'POST' && url === '/__studio/pack') {
            let body: unknown;
            try {
              body = await readJsonBody(request);
            } catch {
              send(response, 400, { ok: false, error: 'invalid JSON body' });
              return;
            }
            if (!isJsonObject(body)) {
              send(response, 400, { ok: false, error: 'body must be an object' });
              return;
            }
            const pack = body['pack'];
            if (typeof pack !== 'object' || pack === null) {
              send(response, 400, { ok: false, error: 'missing pack' });
              return;
            }
            if (!insideProject(root, packFile)) {
              send(response, 400, { ok: false, error: 'target outside project' });
              return;
            }
            await mkdir(dirname(packFile), { recursive: true });
            await writeFile(packFile, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
            send(response, 200, { ok: true, path: PACK_PATH });
            return;
          }

          if (request.method === 'POST' && url === '/__studio/upload') {
            let body: unknown;
            try {
              body = await readJsonBody(request);
            } catch {
              send(response, 400, { ok: false, error: 'invalid JSON body' });
              return;
            }
            if (!isJsonObject(body)) {
              send(response, 400, { ok: false, error: 'body must be an object' });
              return;
            }
            const kind = body['kind'];
            const name = body['name'];
            const data = body['data'];

            if (kind !== 'image' && kind !== 'audio') {
              send(response, 400, { ok: false, error: 'kind must be "image" or "audio"' });
              return;
            }
            if (typeof name !== 'string' || !FILE_SAFE.test(name)) {
              send(response, 400, {
                ok: false,
                error: 'name must be a lowercase kebab-case file name with an allowed extension',
              });
              return;
            }
            if (typeof data !== 'string' || data.length === 0) {
              send(response, 400, { ok: false, error: 'missing file data' });
              return;
            }

            const targetDir = join(root, kind === 'image' ? IMAGE_DIR : AUDIO_DIR);
            const target = join(targetDir, name);
            if (!insideProject(root, target)) {
              send(response, 400, { ok: false, error: 'target outside project' });
              return;
            }

            const buffer = Buffer.from(data, 'base64');
            if (buffer.length === 0 || buffer.length > 6 * 1024 * 1024) {
              send(response, 400, { ok: false, error: 'file must be between 1 byte and 6 MB' });
              return;
            }

            await mkdir(targetDir, { recursive: true });
            await writeFile(target, buffer);
            send(response, 200, {
              ok: true,
              path: `/${kind === 'image' ? 'assets/scenes/chapter-1' : 'assets/audio/chapter-1'}/${name}`,
            });
            return;
          }

          send(response, 404, { ok: false, error: 'unknown studio endpoint' });
        })().catch((error: unknown) => {
          send(response, 500, { ok: false, error: error instanceof Error ? error.message : 'write failed' });
        });
      });
    },
  };
}
