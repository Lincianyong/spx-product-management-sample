// Minimal GFM-style renderer to a structured tree.
// Subset: headings (## ###), bold/italic, inline code, links,
// ordered/unordered lists, blockquote, fenced code, horizontal rules,
// task lists ([x] / [ ]). All output is plain JSX — no `dangerouslySetInnerHTML`.

export type MdNode =
  | { type: "h2"; children: MdInline[] }
  | { type: "h3"; children: MdInline[] }
  | { type: "p"; children: MdInline[] }
  | { type: "ul"; items: { children: MdInline[]; checked: boolean | null }[] }
  | { type: "ol"; items: { children: MdInline[] }[] }
  | { type: "blockquote"; children: MdInline[] }
  | { type: "code"; lang: string; body: string }
  | { type: "hr" };

export type MdInline =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; href: string }
  | { type: "mention"; handle: string }
  | { type: "ticket"; key: string }
  | { type: "br" };

const ESCAPE = "";

export function parseMarkdown(src: string): MdNode[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: MdNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push({ type: "code", lang, body: body.join("\n") });
      continue;
    }

    // Heading
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      out.push({ type: "h2", children: parseInline(h2[1]) });
      i++;
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      out.push({ type: "h3", children: parseInline(h3[1]) });
      i++;
      continue;
    }

    // HR
    if (/^---+\s*$/.test(line)) {
      out.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push({ type: "blockquote", children: parseInline(buf.join(" ")) });
      continue;
    }

    // Unordered list (incl. task list)
    if (/^[-*]\s+/.test(line)) {
      const items: { children: MdInline[]; checked: boolean | null }[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const body = lines[i].replace(/^[-*]\s+/, "");
        const t = body.match(/^\[(x|X|\s)\]\s+(.*)$/);
        if (t) {
          items.push({ children: parseInline(t[2]), checked: t[1] !== " " });
        } else {
          items.push({ children: parseInline(body), checked: null });
        }
        i++;
      }
      out.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: { children: MdInline[] }[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push({ children: parseInline(lines[i].replace(/^\d+\.\s+/, "")) });
        i++;
      }
      out.push({ type: "ol", items });
      continue;
    }

    // Blank line
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Paragraph (gather until blank/new block)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^##\s+/.test(lines[i]) &&
      !/^###\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push({ type: "p", children: parseInline(buf.join("\n")) });
  }
  return out;
}

export function parseInline(text: string): MdInline[] {
  const tokens: MdInline[] = [];
  // Strategy: walk char-by-char, recognizing **bold**, *italic*, `code`, [text](url), @mention, TICKET-####, newlines
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      tokens.push({ type: "text", value: buf });
      buf = "";
    }
  };

  while (i < text.length) {
    const c = text[i];

    // Newline → break (preserve in paragraphs as soft break)
    if (c === "\n") {
      flush();
      tokens.push({ type: "br" });
      i++;
      continue;
    }

    // Inline code
    if (c === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > 0) {
        flush();
        tokens.push({ type: "code", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Bold **
    if (c === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > 0) {
        flush();
        tokens.push({ type: "bold", value: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Italic *
    if (c === "*") {
      const end = text.indexOf("*", i + 1);
      if (end > 0 && end !== i + 1) {
        flush();
        tokens.push({ type: "italic", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Link [text](url)
    if (c === "[") {
      const close = text.indexOf("]", i + 1);
      if (close > 0 && text[close + 1] === "(") {
        const urlEnd = text.indexOf(")", close + 2);
        if (urlEnd > 0) {
          flush();
          tokens.push({ type: "link", value: text.slice(i + 1, close), href: text.slice(close + 2, urlEnd) });
          i = urlEnd + 1;
          continue;
        }
      }
    }

    // @mention
    if (c === "@" && (i === 0 || /\s/.test(text[i - 1]))) {
      const m = text.slice(i).match(/^@([a-z][a-z0-9._-]+)/);
      if (m) {
        flush();
        tokens.push({ type: "mention", handle: m[1] });
        i += m[0].length;
        continue;
      }
    }

    // Ticket key
    if (/[A-Z]/.test(c) && (i === 0 || /[^A-Z0-9-]/.test(text[i - 1]))) {
      const m = text.slice(i).match(/^([A-Z]{2,4}-\d+)/);
      if (m) {
        flush();
        tokens.push({ type: "ticket", key: m[1] });
        i += m[0].length;
        continue;
      }
    }

    buf += c;
    i++;
  }
  flush();
  return tokens;
}
