// Onboarding hero illustration — terminal window with 4 split agent panes
// Matches approved Variant A mockup

export function createHeroIllustration(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'onboarding-hero';
  wrapper.innerHTML = `<svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Terminal window frame -->
    <rect x="20" y="10" width="240" height="170" rx="10" fill="#16161e" stroke="#2a2b3d" stroke-width="1.5"/>

    <!-- Window chrome dots -->
    <circle cx="38" cy="24" r="4" fill="#f7768e"/>
    <circle cx="52" cy="24" r="4" fill="#e0af68"/>
    <circle cx="66" cy="24" r="4" fill="#9ece6a"/>

    <!-- Divider lines (split panes) -->
    <line x1="140" y1="36" x2="140" y2="170" stroke="#2a2b3d" stroke-width="1"/>
    <line x1="20" y1="103" x2="260" y2="103" stroke="#2a2b3d" stroke-width="1"/>

    <!-- Pane 1: Claude (top-left) — warm brown -->
    <g transform="translate(58, 56)">
      <circle r="16" fill="none" stroke="#d4a27f" stroke-width="1.5" opacity="0.3"/>
      <text text-anchor="middle" dy="5" fill="#d4a27f" font-size="14" font-weight="bold" font-family="monospace">C</text>
    </g>
    <!-- Pane 1 terminal lines -->
    <rect x="34" y="78" width="30" height="2" rx="1" fill="#7aa2f7" opacity="0.4"/>
    <rect x="34" y="84" width="48" height="2" rx="1" fill="#414868" opacity="0.3"/>

    <!-- Pane 2: Gemini (top-right) — blue sparkle -->
    <g transform="translate(198, 56)">
      <path d="M0 -14C0 -6 -6 0 -14 0C-6 0 0 6 0 14C0 6 6 0 14 0C6 0 0 -6 0 -14z" fill="#4285f4" opacity="0.7"/>
    </g>
    <!-- Pane 2 terminal lines -->
    <rect x="154" y="78" width="40" height="2" rx="1" fill="#4285f4" opacity="0.4"/>
    <rect x="154" y="84" width="52" height="2" rx="1" fill="#414868" opacity="0.3"/>

    <!-- Pane 3: Aider (bottom-left) — teal -->
    <g transform="translate(58, 124)">
      <rect x="-14" y="-10" width="28" height="20" rx="4" fill="none" stroke="#14b8a6" stroke-width="1.5" opacity="0.5"/>
      <text text-anchor="middle" dy="4" fill="#14b8a6" font-size="10" font-weight="bold" font-family="monospace">&lt;/&gt;</text>
    </g>
    <!-- Pane 3 terminal lines -->
    <rect x="34" y="146" width="44" height="2" rx="1" fill="#14b8a6" opacity="0.4"/>
    <rect x="34" y="152" width="32" height="2" rx="1" fill="#414868" opacity="0.3"/>

    <!-- Pane 4: Codex (bottom-right) — green hexagon -->
    <g transform="translate(198, 124)">
      <polygon points="0,-14 12,-7 12,7 0,14 -12,7 -12,-7" fill="none" stroke="#10a37f" stroke-width="1.5" opacity="0.5"/>
      <text text-anchor="middle" dy="4" fill="#10a37f" font-size="9" font-weight="bold" font-family="monospace">AI</text>
    </g>
    <!-- Pane 4 terminal lines -->
    <rect x="154" y="146" width="36" height="2" rx="1" fill="#10a37f" opacity="0.4"/>
    <rect x="154" y="152" width="50" height="2" rx="1" fill="#414868" opacity="0.3"/>

    <!-- Subtle glow behind window -->
    <defs>
      <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#7aa2f7" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#7aa2f7" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="280" height="200" fill="url(#hero-glow)"/>
  </svg>`;

  return wrapper;
}
