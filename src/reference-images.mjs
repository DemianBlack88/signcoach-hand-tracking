const IMAGE_MODULES = import.meta.glob("./assets/references/asl-*.webp", {
  eager: true,
  import: "default",
  query: "?url"
});

export const ASL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function getHandshapeReferenceImage(target) {
  const letter = String(target || "A").toLowerCase();
  return IMAGE_MODULES[`./assets/references/asl-${letter}.webp`] || IMAGE_MODULES["./assets/references/asl-a.webp"];
}

export function renderHandshapeReference(target, { compact = false } = {}) {
  const letter = String(target || "A").toUpperCase();
  const imageUrl = getHandshapeReferenceImage(letter);
  const compactClass = compact ? " is-compact" : "";

  return `
    <figure class="handshape-reference${compactClass}" aria-label="ASL ${letter} reference handshape">
      <img src="${imageUrl}" alt="ASL ${letter} handshape reference" />
    </figure>
  `;
}
