import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { HANDSHAPE_REFERENCES } from "../src/reference-handshapes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

test("reference metadata exists for the full ASL alphabet", () => {
  assert.deepEqual(Object.keys(HANDSHAPE_REFERENCES), alphabet);

  for (const letter of alphabet) {
    assert.ok(HANDSHAPE_REFERENCES[letter].title.includes(`${letter}:`));
    assert.ok(HANDSHAPE_REFERENCES[letter].cues.length >= 3);
  }
});

test("cropped static reference assets exist for the full ASL alphabet", () => {
  for (const letter of alphabet) {
    const fileName = `asl-${letter.toLowerCase()}.webp`;
    const assetPath = join(projectRoot, "src", "assets", "references", fileName);
    assert.equal(existsSync(assetPath), true, `${fileName} should exist`);
  }
});

test("secondary reference assets exist for active practice letters", () => {
  for (const letter of ["A", "B", "C", "F", "I", "L", "Y"]) {
    const fileName = `asl-${letter.toLowerCase()}.webp`;
    const assetPath = join(projectRoot, "src", "assets", "references-secondary", fileName);
    assert.equal(existsSync(assetPath), true, `${fileName} should exist in secondary references`);
  }
});
