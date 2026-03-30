// Step 0: Welcome screen

import type { StepRenderer } from './onboarding-wizard';
import { createHeroIllustration } from './onboarding-hero';

export class WelcomeStep implements StepRenderer {
  render(container: HTMLElement): void {
    const hero = createHeroIllustration();

    const headline = document.createElement('h2');
    headline.className = 'onboarding-headline';
    headline.textContent = 'One terminal to rule them all.';

    const body = document.createElement('p');
    body.className = 'onboarding-body';
    body.textContent = 'Run Claude, Gemini, Aider, and 9 more AI agents side by side \u2014 in split panes, with voice input and git worktree isolation.';

    container.appendChild(hero);
    container.appendChild(headline);
    container.appendChild(body);
  }
}
