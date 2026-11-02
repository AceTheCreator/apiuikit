import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../marked";

describe("renderMarkdown", () => {
  it("passes raw HTML through by default, for DOMPurify to sanitize", () => {
    expect(renderMarkdown("Hello <b>world</b>")).toContain("<b>world</b>");
  });

  describe("serverSafe", () => {
    it("keeps the text of raw HTML but not its tags", () => {
      const html = renderMarkdown('Hello <b onmouseover="x()">world</b>', { serverSafe: true });

      expect(html).toContain("world");
      expect(html).not.toContain("<b");
      expect(html).not.toContain("onmouseover");
    });

    it("drops script and style blocks entirely", () => {
      const html = renderMarkdown("Before\n\n<script>alert(1)</script>\n\n<style>p{}</style>\n\nAfter", {
        serverSafe: true,
      });

      expect(html).not.toContain("alert");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("p{}");
      expect(html).toContain("After");
    });

    it("escapes whatever a malformed tag leaves behind", () => {
      const html = renderMarkdown("<img src=x onerror=alert(1)//", { serverSafe: true });

      expect(html).not.toMatch(/<img/i);
    });

    it("still renders Markdown formatting and code", () => {
      const html = renderMarkdown("**bold**\n\n```json\n{\"a\": 1}\n```", { serverSafe: true });

      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain('class="hljs-attr"');
    });
  });

  describe.each([false, true])("links (serverSafe: %s)", (serverSafe) => {
    it("renders http(s), mailto, relative and fragment links", () => {
      for (const href of ["https://example.com/a?b=1&c=2", "mailto:a@example.com", "/docs/intro", "#pets"]) {
        expect(renderMarkdown(`[go](${href})`, { serverSafe })).toContain("<a ");
      }
    });

    it("escapes the href attribute", () => {
      expect(renderMarkdown("[go](https://example.com/a?b=1&c=2)", { serverSafe })).toContain(
        'href="https://example.com/a?b=1&amp;c=2"',
      );
    });

    it("renders script URLs as plain text", () => {
      for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,hi", "vbscript:x"]) {
        const html = renderMarkdown(`[go](${href})`, { serverSafe });
        expect(html).not.toContain("<a ");
        expect(html).toContain("go");
      }
    });

    it("renders inline Markdown inside link text", () => {
      expect(renderMarkdown("[**bold** link](https://example.com)", { serverSafe })).toMatch(
        /<a [^>]*><strong>bold<\/strong> link<\/a>/,
      );
    });
  });
});
