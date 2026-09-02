import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanWikitext } from './ingest-lovecraft-wiki.mjs';

test('retains text from ordinary and nested HTML markup without markup delimiters', () => {
  const result = cleanWikitext("== Heading ==\n[[Arkham|<b>Arkham <i>City</i></b>]]");

  assert.equal(result, '### Heading\nArkham City');
  assert.doesNotMatch(result, /[<>]/);
});

test('drops malformed and nested markup without leaving an HTML fragment', () => {
  const result = cleanWikitext('Before <section><script>alert(1)</script></section> After');

  assert.equal(result, 'Before alert(1) After');
  assert.doesNotMatch(result, /[<>]/);
});

test('drops an unterminated malicious tag and everything after it', () => {
  const result = cleanWikitext('Safe text <script src="https://attacker.invalid/payload.js"');

  assert.equal(result, 'Safe text');
  assert.doesNotMatch(result, /[<>]/);
});

test('keeps ordinary wikitext cleaning behaviour', () => {
  const result = cleanWikitext("{{Infobox|ignored}} '''The''' [[Necronomicon]] <ref>citation</ref>");

  assert.equal(result, 'The Necronomicon');
});
