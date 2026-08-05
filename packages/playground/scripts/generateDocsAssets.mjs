// Generates the AI- and human-discoverable docs surface that gets published
// with the playground: llms.txt, llms-full.txt, and a raw copy of every
// markdown doc in the repo.
//
// Everything is generated from the repo's own markdown at build time rather
// than hand-maintained, so a doc edit can't leave the published copies stale.
// Output lands in packages/playground/public/, which Vite copies verbatim into
// the build that Netlify publishes.
//
// The published paths mirror the repo layout (/README.md, /docs/usage/*.md),
// which is what keeps the relative links *inside* those files working: the
// README's ./docs/usage/openapi.md and a doc's ../../README.md both resolve to
// the right URL without rewriting anything.
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const publicDir = join(here, "..", "public");

const SITE = "https://apiuikit.com";
const REPO = "https://github.com/AceTheCreator/apiuikit";

/** Files to publish, in the order they should appear to a reader. */
async function collectDocs() {
  const usageDir = join(repoRoot, "docs", "usage");
  const usageFiles = (await readdir(usageDir))
    .filter((name) => name.endsWith(".md"))
    .sort();

  return [
    { path: "README.md", absolute: join(repoRoot, "README.md") },
    ...usageFiles.map((name) => ({
      path: `docs/usage/${name}`,
      absolute: join(usageDir, name),
    })),
  ];
}

/** First `# ` heading, falling back to the filename. */
function extractTitle(markdown, path) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : path;
}

/** First paragraph of real prose: skips headings, blockquotes, code fences,
 * tables, and list items so the summary isn't a stray table row. */
function extractParagraph(markdown) {
  const lines = markdown.split("\n");
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !trimmed) continue;
    if (/^[#>|\-*\d]/.test(trimmed)) continue;
    return trimmed;
  }
  return "";
}

/** The paragraph cut to its first sentence, for one-line link descriptions.
 * The lookahead keeps dots inside "AsyncAPI 3.x" or "@asyncapi/parser" from
 * counting as sentence ends. */
function extractSummary(markdown) {
  const paragraph = extractParagraph(markdown);
  const sentence = paragraph.match(/^.*?[.!?](?=\s|$)/);
  return (sentence ? sentence[0] : paragraph).trim();
}

function buildLlmsTxt(docs) {
  const [readme, ...usage] = docs;

  const lines = [
    "# apiuikit",
    "",
    `> ${readme.paragraph}`,
    "",
    "apiuikit is an npm package, not a hosted service, so there is no HTTP API to describe.",
    "Install it with `npm install apiuikit` and render a document with the `AsyncAPI` or `OpenAPI` component.",
    "",
    "Every link below serves raw markdown, at a path mirroring the repository layout.",
    "",
    "## Docs",
    "",
    `- [${readme.title}](${SITE}/${readme.path}): ${readme.summary}`,
    ...usage.map((doc) => `- [${doc.title}](${SITE}/${doc.path}): ${doc.summary}`),
    "",
    "## Optional",
    "",
    `- [Source repository](${REPO}): issues, changelog, and the component source`,
    `- [Playground](${SITE}): paste a document and see it rendered`,
    `- [Full documentation as one file](${SITE}/llms-full.txt): every page above, concatenated`,
    "",
  ];

  return lines.join("\n");
}

function buildLlmsFullTxt(docs) {
  const header = [
    "# apiuikit: full documentation",
    "",
    `Generated from ${REPO}. Every page is also available individually as raw`,
    `markdown under ${SITE}/, at the paths shown below.`,
    "",
  ].join("\n");

  const sections = docs.map((doc) =>
    [`\n\n---\n`, `# Source: ${doc.path} (${SITE}/${doc.path})`, "", doc.markdown.trim(), ""].join("\n"),
  );

  return header + sections.join("");
}

/** Netlify serves .md as text/markdown, which browsers download instead of
 * displaying. Serving them as plain text makes the links usable in a browser,
 * and the CORS header lets a tool fetch them cross-origin. Paths are listed
 * explicitly rather than globbed, since the set is known here anyway. */
function buildHeaders(docs) {
  const paths = ["llms.txt", "llms-full.txt", ...docs.map((doc) => doc.path)];

  return paths
    .map((path) =>
      [`/${path}`, "  Content-Type: text/plain; charset=utf-8", "  Access-Control-Allow-Origin: *", ""].join("\n"),
    )
    .join("\n");
}

async function main() {
  const docs = await Promise.all(
    (await collectDocs()).map(async (doc) => {
      const markdown = await readFile(doc.absolute, "utf8");
      return {
        ...doc,
        markdown,
        title: extractTitle(markdown, doc.path),
        paragraph: extractParagraph(markdown),
        summary: extractSummary(markdown),
      };
    }),
  );

  // Wipe only what this script owns, so any hand-added public asset survives.
  await rm(join(publicDir, "docs"), { recursive: true, force: true });
  await mkdir(publicDir, { recursive: true });

  for (const doc of docs) {
    const target = join(publicDir, doc.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, doc.markdown);
  }

  await writeFile(join(publicDir, "llms.txt"), buildLlmsTxt(docs));
  await writeFile(join(publicDir, "llms-full.txt"), buildLlmsFullTxt(docs));
  await writeFile(join(publicDir, "_headers"), buildHeaders(docs));

  const written = docs.length + 3;
  console.log(`[docs-assets] wrote ${written} files to ${relative(repoRoot, publicDir)}/`);
}

main().catch((error) => {
  console.error("[docs-assets] failed:", error);
  process.exit(1);
});
