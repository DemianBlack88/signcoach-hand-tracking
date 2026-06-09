const BASE_SVG = {
  A: {
    className: "gesture-demo gesture-demo-a",
    label: "Animated ASL A handshape reference",
    badge: "Thumb stays on the side",
    svg: `
      <svg viewBox="0 0 220 170" role="img" aria-label="ASL A animated handshape">
        <path class="palm" d="M78 74 C78 48 97 34 118 38 C140 42 151 61 147 86 L142 122 C139 145 122 158 100 154 C78 150 64 132 67 109 Z"/>
        <path class="fold finger-one" d="M78 74 C78 51 91 42 104 48 C115 53 117 68 108 80"/>
        <path class="fold finger-two" d="M99 62 C100 39 114 31 127 39 C137 45 138 62 128 75"/>
        <path class="fold finger-three" d="M119 64 C124 44 139 39 149 49 C158 58 154 75 140 84"/>
        <path class="fold finger-four" d="M135 80 C146 66 160 68 165 81 C170 94 158 107 141 106"/>
        <path class="thumb thumb-side" d="M75 103 C49 100 36 88 39 75 C42 61 61 63 76 77"/>
        <path class="cue-line" d="M43 53 C55 41 73 40 89 49"/>
        <text x="110" y="163" text-anchor="middle">A</text>
      </svg>`
  },
  B: {
    className: "gesture-demo gesture-demo-b",
    label: "Animated ASL B handshape reference",
    badge: "Palm faces camera",
    svg: `
      <svg viewBox="0 0 220 170" role="img" aria-label="ASL B animated handshape">
        <path class="palm" d="M75 84 C75 59 91 47 111 47 C132 47 147 62 147 88 L147 123 C147 143 132 155 111 155 C90 155 75 143 75 123 Z"/>
        <path class="straight finger-one" d="M77 86 L77 35 C77 24 91 24 91 35 L91 84"/>
        <path class="straight finger-two" d="M94 82 L94 25 C94 13 109 13 109 25 L109 82"/>
        <path class="straight finger-three" d="M112 82 L112 27 C112 15 127 15 127 27 L127 84"/>
        <path class="straight finger-four" d="M130 86 L130 42 C130 31 144 31 144 42 L144 90"/>
        <path class="thumb thumb-folded" d="M74 112 C99 110 119 103 135 89"/>
        <path class="cue-line" d="M69 24 L148 24"/>
        <text x="110" y="164" text-anchor="middle">B</text>
      </svg>`
  },
  L: {
    className: "gesture-demo gesture-demo-l",
    label: "Animated ASL L handshape reference",
    badge: "Index up, thumb out",
    svg: `
      <svg viewBox="0 0 220 170" role="img" aria-label="ASL L animated handshape">
        <path class="palm" d="M86 82 C86 59 101 46 121 49 C140 52 151 69 146 91 L141 121 C137 145 119 157 98 152 C78 147 67 130 71 109 Z"/>
        <path class="index-up" d="M89 87 L89 31 C89 20 104 20 104 31 L104 86"/>
        <path class="fold finger-two" d="M110 73 C114 55 127 50 137 59 C147 68 143 84 128 91"/>
        <path class="fold finger-three" d="M126 82 C137 69 151 72 156 84 C161 97 149 109 132 107"/>
        <path class="fold finger-four" d="M133 99 C146 91 158 96 158 110 C158 124 142 130 127 121"/>
        <path class="thumb thumb-open" d="M83 106 C58 105 42 98 37 84 C33 72 47 65 62 72 C72 77 81 84 91 94"/>
        <path class="cue-line" d="M37 84 L94 30"/>
        <text x="110" y="164" text-anchor="middle">L</text>
      </svg>`
  }
};

export function renderHandshapeDemo(target, { compact = false } = {}) {
  const demo = BASE_SVG[target] || BASE_SVG.A;
  const compactClass = compact ? " is-compact" : "";

  return `
    <figure class="${demo.className}${compactClass}" aria-label="${demo.label}">
      <div class="gesture-demo-stage">
        ${demo.svg}
        <span class="gesture-demo-badge">${demo.badge}</span>
      </div>
    </figure>
  `;
}
