const IMAGE_MODULES = import.meta.glob("./assets/references/asl-*.webp", {
  eager: true,
  import: "default",
  query: "?url"
});

const SECONDARY_IMAGE_MODULES = import.meta.glob("./assets/references-secondary/asl-*.webp", {
  eager: true,
  import: "default",
  query: "?url"
});

export const ASL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function getHandshapeReferenceImage(target) {
  const letter = String(target || "A").toLowerCase();
  return IMAGE_MODULES[`./assets/references/asl-${letter}.webp`] || IMAGE_MODULES["./assets/references/asl-a.webp"];
}

export function getSecondaryHandshapeReferenceImage(target) {
  const letter = String(target || "A").toLowerCase();
  return SECONDARY_IMAGE_MODULES[`./assets/references-secondary/asl-${letter}.webp`] || null;
}

export function renderHandshapeReference(target, { compact = false } = {}) {
  const letter = String(target || "A").toUpperCase();
  const primaryImageUrl = getHandshapeReferenceImage(letter);
  const secondaryImageUrl = getSecondaryHandshapeReferenceImage(letter);
  const compactClass = compact ? " is-compact" : "";
  const compactImageUrl = secondaryImageUrl || primaryImageUrl;

  if (compact) {
    return `
      <figure class="handshape-reference${compactClass}" aria-label="ASL ${letter} reference handshape">
        <img src="${compactImageUrl}" alt="ASL ${letter} handshape reference" />
      </figure>
    `;
  }

  return `
    <figure class="handshape-reference${compactClass}" aria-label="ASL ${letter} reference handshape">
      <div class="reference-pair">
        <img src="${primaryImageUrl}" alt="ASL ${letter} primary handshape reference" />
        ${secondaryImageUrl ? `<img src="${secondaryImageUrl}" alt="ASL ${letter} secondary handshape reference" />` : ""}
      </div>
    </figure>
  `;
}
