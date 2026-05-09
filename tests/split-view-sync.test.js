/**
 * Regression test for split-view right-pane sync.
 *
 * Bug: when reading a JS-rendered page like https://github.com/<owner>/<repo>,
 * paragraphs late in the README (e.g. "Pre-built installers are coming. Until
 * then it's source-build only.") sometimes failed to scroll the right iframe
 * to the matching element. The cause: `buildSplitViewMapping` scanned the
 * whole iframe document (including chrome / sidebar / file-tree blocks), but
 * `extractTextFromHTML` extracted the left pane only from the article-like
 * content root. When the cursor-based forward match advanced past chrome
 * candidates that happened to share short prefixes ("What", "Why"), real
 * article paragraphs further down were left unmapped.
 *
 * Fix: scope the right-pane candidate scan to the same content root used on
 * the left, and require a minimum prefix length for "starts-with" matches so
 * very short headings can't anchor the cursor onto the wrong candidate.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc;

beforeAll(() => {
  readerSrc = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
});

describe('split-view sync source-level invariants', () => {
  test('shared content-area selectors are defined as named constants', () => {
    expect(readerSrc).toMatch(/const\s+CONTENT_ROOT_SELECTOR\s*=/);
    expect(readerSrc).toMatch(/const\s+CONTENT_BLOCK_SELECTOR\s*=/);
    expect(readerSrc).toMatch(/const\s+NON_CONTENT_SELECTOR\s*=/);
  });

  test('extractTextFromHTML and split-view mapping share content-block selector', () => {
    // Both code paths must walk the same set of block-level elements,
    // otherwise the cursor index can desync between left and right panes.
    const blockListings = readerSrc.match(/CONTENT_BLOCK_SELECTOR/g) || [];
    expect(blockListings.length).toBeGreaterThanOrEqual(2);
  });

  test('buildSplitViewMapping scopes scan to the content root', () => {
    // The function must call collectIframeCandidates (which uses the shared
    // CONTENT_ROOT_SELECTOR) instead of querying the whole document, so
    // GitHub-style chrome elements don't pollute the candidate list.
    const fnMatch = readerSrc.match(/function buildSplitViewMapping\(\)\s*\{[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toContain('collectIframeCandidates');
    expect(fnMatch[0]).not.toMatch(/doc\.querySelectorAll\(['"]p, h1/);
  });

  test('short prefixes do not trigger starts-with matches', () => {
    expect(readerSrc).toMatch(/SPLIT_SYNC_MIN_PREFIX/);
    const helperMatch = readerSrc.match(/function isPrefixMatch\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(helperMatch).not.toBeNull();
    expect(helperMatch[0]).toMatch(/SPLIT_SYNC_MIN_PREFIX/);
  });
});

describe('split-view sync behavior on github-like DOM', () => {
  // Reproduce the mapping algorithm in isolation against a synthetic page
  // that mirrors github.com's repo view: chrome with its own headings/p's,
  // plus an <article class="markdown-body"> containing the README.
  // The test confirms that a late article paragraph maps to its matching
  // element instead of being skipped because the cursor advanced past it.
  const CONTENT_ROOT_SELECTOR = 'article, [role="main"], main, .post-content, .entry-content, .article-body';
  const CONTENT_BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, td, pre';
  const SPLIT_SYNC_MIN_PREFIX = 8;

  function isInsideNonContent(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const tag = n.tagName;
      if (tag === 'NAV' || tag === 'HEADER' || tag === 'FOOTER' || tag === 'ASIDE') return true;
      const role = n.getAttribute && n.getAttribute('role');
      if (role === 'navigation') return true;
    }
    return false;
  }
  function findContentRoot(doc) {
    if (!doc) return null;
    const root = doc.querySelector(CONTENT_ROOT_SELECTOR);
    if (root) return { root, scoped: true };
    if (doc.body) return { root: doc.body, scoped: false };
    return null;
  }
  function collectIframeCandidates(doc) {
    const found = findContentRoot(doc);
    if (!found) return [];
    const all = Array.from(found.root.querySelectorAll(CONTENT_BLOCK_SELECTOR));
    if (found.scoped) return all;
    return all.filter(el => !isInsideNonContent(el));
  }
  function normalizeForSync(s) {
    return (s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }
  function isPrefixMatch(candPrefix, target) {
    if (!candPrefix || !target) return false;
    if (candPrefix === target) return true;
    const shorter = Math.min(candPrefix.length, target.length);
    if (shorter < SPLIT_SYNC_MIN_PREFIX) return false;
    return candPrefix.startsWith(target) || target.startsWith(candPrefix);
  }
  function buildMapping(leftTexts, doc) {
    const candidates = collectIframeCandidates(doc);
    const candPrefixes = candidates.map(el => normalizeForSync(el.textContent));
    const elementMapping = new Array(leftTexts.length).fill(null);
    let cursor = 0;
    for (let i = 0; i < leftTexts.length; i++) {
      const target = normalizeForSync(leftTexts[i]);
      if (!target) continue;
      for (let j = cursor; j < candidates.length; j++) {
        if (!candPrefixes[j]) continue;
        if (isPrefixMatch(candPrefixes[j], target)) {
          elementMapping[i] = candidates[j];
          cursor = j + 1;
          break;
        }
      }
    }
    return elementMapping;
  }

  function buildGithubLikeDoc() {
    const html = `<!DOCTYPE html><html><body>
      <header>
        <nav><h2>Navigation Menu</h2></nav>
        <h1 class="sr-only">Search code, repositories, users, issues, pull requests</h1>
        <h1>Provide feedback</h1>
        <p>We read every piece of feedback, and take your input very seriously.</p>
        <h1>Saved searches</h1>
        <h2>Use saved searches to filter your results more quickly</h2>
      </header>
      <div class="repo-chrome">
        <h1 class="sr-only">xiaolai/claudepot-app</h1>
        <h2>Repository files navigation</h2>
        <ul>
          <li>.cargo</li>
          <li>.github</li>
          <li>README.md</li>
        </ul>
        <h2>Latest commit</h2>
        <h2>History</h2>
      </div>
      <article class="markdown-body">
        <h1>Claudepot</h1>
        <p>A control panel for Claude Code and Claude Desktop.</p>
        <p>What · Why · How · For developers</p>
        <h2>What</h2>
        <p>Claudepot is a desktop control panel.</p>
        <h2>Why</h2>
        <p>Because juggling profiles by hand is painful.</p>
        <h2>How</h2>
        <blockquote><p>The orchards are green but less seasoned.</p></blockquote>
        <p>You'll need a recent Rust toolchain and Node 20+ with pnpm.</p>
        <pre>git clone https://github.com/xiaolai/claudepot-app.git
cd claudepot-app
cargo build -p claudepot-cli --release
pnpm install
pnpm tauri dev</pre>
        <p>Pre-built installers are coming. Until then it's source-build only.</p>
        <p>Your data lives at ~/.claudepot/ (override with CLAUDEPOT_DATA_DIR).</p>
      </article>
      <footer><p>© GitHub Inc.</p></footer>
    </body></html>`;
    return new DOMParser().parseFromString(html, 'text/html');
  }

  test('article paragraph after code block maps to the matching <p>', () => {
    const doc = buildGithubLikeDoc();
    // Mirror what extractTextFromHTML produces on the left pane.
    const leftBlocks = Array.from(
      doc.querySelector(CONTENT_ROOT_SELECTOR).querySelectorAll(CONTENT_BLOCK_SELECTOR)
    ).map(el => el.textContent.trim()).filter(t => t.length > 0);

    const targetIdx = leftBlocks.findIndex(t =>
      t.startsWith("Pre-built installers are coming")
    );
    expect(targetIdx).toBeGreaterThan(0);

    const mapping = buildMapping(leftBlocks, doc);
    const matchedEl = mapping[targetIdx];
    expect(matchedEl).not.toBeNull();
    expect(matchedEl.tagName).toBe('P');
    expect(matchedEl.textContent).toContain('Pre-built installers are coming');
    // And the matched element must live inside the article, not somewhere
    // in the page chrome — that's the whole point of scoping.
    expect(matchedEl.closest('article')).not.toBeNull();
  });

  test('every article paragraph in the left pane gets a non-null mapping', () => {
    const doc = buildGithubLikeDoc();
    const leftBlocks = Array.from(
      doc.querySelector(CONTENT_ROOT_SELECTOR).querySelectorAll(CONTENT_BLOCK_SELECTOR)
    ).map(el => el.textContent.trim()).filter(t => t.length > 0);

    const mapping = buildMapping(leftBlocks, doc);
    const unmapped = mapping
      .map((el, i) => (el ? null : leftBlocks[i]))
      .filter(Boolean);
    expect(unmapped).toEqual([]);
  });

  test('falls back to body but excludes nav/header/footer when no article exists', () => {
    const html = `<!DOCTYPE html><html><body>
      <header><h1>Site title</h1><p>Header tagline</p></header>
      <nav><h2>Menu</h2></nav>
      <h1>Main story</h1>
      <p>This page has no article element.</p>
      <p>But it still has body-level content worth syncing.</p>
      <footer><p>Footer note</p></footer>
    </body></html>`;
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const leftBlocks = ['Main story', 'This page has no article element.', 'But it still has body-level content worth syncing.'];
    const mapping = buildMapping(leftBlocks, doc);

    expect(mapping[0]).not.toBeNull();
    expect(mapping[0].closest('header')).toBeNull();
    expect(mapping[0].closest('footer')).toBeNull();
    expect(mapping[0].textContent).toBe('Main story');
    expect(mapping[1].textContent).toContain('no article element');
    expect(mapping[2].textContent).toContain('body-level content');
  });
});
