export const HANDSHAPE_REFERENCES = {
  A: {
    title: "Closed fist",
    cues: ["Fingers folded", "Thumb rests along the side"],
    svg: `
      <svg viewBox="0 0 160 160" role="img" aria-label="Reference handshape for A">
        <rect class="ref-finger folded" x="48" y="43" width="21" height="62" rx="11" />
        <rect class="ref-finger folded" x="67" y="36" width="22" height="68" rx="11" />
        <rect class="ref-finger folded" x="88" y="40" width="21" height="65" rx="11" />
        <rect class="ref-finger folded" x="107" y="52" width="19" height="53" rx="10" />
        <path class="ref-palm" d="M42 82c0-17 13-31 30-31h37c17 0 30 14 30 31v21c0 24-19 43-43 43H84c-24 0-43-19-43-43Z" />
        <path class="ref-thumb" d="M41 93c-18 5-25 18-17 31 8 12 28 9 38-8" />
        <path class="ref-line" d="M61 92h75M58 111h77" />
      </svg>
    `
  },
  B: {
    title: "Flat hand",
    cues: ["Four fingers extended", "Thumb folded across palm"],
    svg: `
      <svg viewBox="0 0 160 160" role="img" aria-label="Reference handshape for B">
        <rect class="ref-finger" x="42" y="11" width="20" height="82" rx="10" />
        <rect class="ref-finger" x="62" y="7" width="21" height="88" rx="10" />
        <rect class="ref-finger" x="83" y="10" width="21" height="86" rx="10" />
        <rect class="ref-finger" x="104" y="18" width="20" height="78" rx="10" />
        <path class="ref-palm" d="M38 82c0-13 11-24 24-24h51c13 0 24 11 24 24v35c0 22-18 40-40 40H78c-22 0-40-18-40-40Z" />
        <path class="ref-thumb" d="M127 95c-19 4-43 13-61 31" />
        <path class="ref-line" d="M59 71v42M82 68v43M105 72v39" />
      </svg>
    `
  },
  L: {
    title: "Index and thumb",
    cues: ["Index finger extended", "Thumb opens out; other fingers fold"],
    svg: `
      <svg viewBox="0 0 160 160" role="img" aria-label="Reference handshape for L">
        <rect class="ref-finger" x="66" y="8" width="23" height="95" rx="12" />
        <path class="ref-palm" d="M42 79c0-15 12-27 27-27h31c17 0 31 14 31 31v33c0 22-18 40-40 40H82c-24 0-44-20-44-44Z" />
        <path class="ref-thumb" d="M48 91C26 84 14 89 10 104c-4 16 13 28 34 18 14-7 23-17 32-28" />
        <rect class="ref-finger folded" x="91" y="55" width="20" height="50" rx="10" />
        <rect class="ref-finger folded" x="109" y="62" width="18" height="45" rx="9" />
        <path class="ref-line" d="M77 102v28M94 105v27M112 107v24" />
      </svg>
    `
  }
};
