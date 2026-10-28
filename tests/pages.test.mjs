import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createServer, preview, resolveConfig } from "vite";

const images = [
  "images/memory-family.jpg",
  "images/memory-home.jpg",
  "images/memory-garden.jpg",
];

// The single-file plugin also modifies Vite's base; test the resolved config,
// not just the value written in vite.config.ts.
test("Pages base paths are preserved in development and production", async (t) => {
  const originalBase = process.env.PAGES_BASE_PATH;

  try {
    for (const [input, expectedBase] of [
      ["", "/"],
      ["/example-project", "/example-project/"],
      ["/example-project/", "/example-project/"],
    ]) {
      await t.test(`base ${JSON.stringify(input)}`, async () => {
        process.env.PAGES_BASE_PATH = input;

        const config = await resolveConfig({}, "build");
        assert.equal(config.base, expectedBase);
        assert.equal(config.env.BASE_URL, expectedBase);

        const server = await createServer({
          logLevel: "silent",
          server: { middlewareMode: true },
        });
        try {
          assert.equal(server.config.env.BASE_URL, expectedBase);
          const { MEMORIES } = await server.ssrLoadModule("/src/game/data.ts");
          assert.deepEqual(
            MEMORIES.flatMap((memory) => (memory.image ? [memory.image] : [])),
            images.map((image) => `${expectedBase}${image}`),
          );
          await Promise.all(images.map((image) => access(path.join("public", image))));
        } finally {
          await server.close();
        }
      });
    }
  } finally {
    if (originalBase === undefined) delete process.env.PAGES_BASE_PATH;
    else process.env.PAGES_BASE_PATH = originalBase;
  }
});

test("production output serves the compiled app and images at the Pages base", async () => {
  const server = await preview({
    logLevel: "silent",
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });

  try {
    const { port } = server.httpServer.address();
    const origin = `http://127.0.0.1:${port}`;
    const base = server.config.env.BASE_URL;
    const response = await fetch(`${origin}${base}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    const html = await response.text();
    assert.match(html, /<div id="root"><\/div>/);
    assert.match(html, /<script type="module"/);
    assert.doesNotMatch(html, /src="\/src\/main\.tsx"/);

    for (const image of images) {
      const imageUrl = `${base}${image}`;
      // The JS is inlined by vite-plugin-singlefile; check its actual build output.
      assert.ok(html.includes(imageUrl), `Missing image URL in compiled app: ${imageUrl}`);
      const imageResponse = await fetch(`${origin}${imageUrl}`);
      assert.equal(imageResponse.status, 200, imageUrl);
      assert.match(imageResponse.headers.get("content-type"), /image\/jpeg/);
      const bytes = new Uint8Array(await imageResponse.arrayBuffer());
      assert.deepEqual([...bytes.slice(0, 3)], [0xff, 0xd8, 0xff]);
    }
  } finally {
    await new Promise((resolve, reject) => server.httpServer.close((error) => (error ? reject(error) : resolve())));
  }
});
