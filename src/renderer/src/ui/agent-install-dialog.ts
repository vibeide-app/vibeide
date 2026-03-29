import type { AgentInstallInfo } from '../../../shared/agent-install-info';
import { createAgentIcon } from './agent-icons';
import type { AgentType } from '../../../shared/agent-types';

export type InstallCallback = (installCommand: string) => void;

let _onInstall: InstallCallback | null = null;

export function setInstallCallback(cb: InstallCallback): void {
  _onInstall = cb;
}

export function showAgentInstallDialog(
  agentType: AgentType,
  info: AgentInstallInfo,
): void {
  // Remove any existing dialog
  const existing = document.querySelector('.agent-install-dialog');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'agent-install-dialog';

  const card = document.createElement('div');
  card.className = 'agent-install-card';

  // Header with icon
  const header = document.createElement('div');
  header.className = 'agent-install-header';

  const icon = createAgentIcon(agentType, 24);
  const title = document.createElement('h3');
  title.textContent = `${info.displayName} not found`;
  title.style.margin = '0';

  header.appendChild(icon);
  header.appendChild(title);

  // Description
  const desc = document.createElement('p');
  desc.className = 'agent-install-desc';
  desc.textContent = `${info.displayName} is not installed on your system. ${info.description}.`;

  // Install command
  const cmdLabel = document.createElement('p');
  cmdLabel.className = 'agent-install-cmd-label';
  cmdLabel.textContent = 'Install with:';

  const cmdBox = document.createElement('div');
  cmdBox.className = 'agent-install-cmd';

  const cmdText = document.createElement('code');
  cmdText.textContent = info.installCommand;

  cmdBox.appendChild(cmdText);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'agent-install-buttons';

  const docsBtn = document.createElement('a');
  docsBtn.className = 'agent-install-docs-btn';
  docsBtn.textContent = 'View Docs';
  docsBtn.href = info.docsUrl;
  docsBtn.target = '_blank';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'agent-install-close-btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => overlay.remove());

  const installBtn = document.createElement('button');
  installBtn.className = 'agent-install-run-btn';
  installBtn.textContent = 'Install';
  installBtn.addEventListener('click', () => {
    overlay.remove();
    if (_onInstall) {
      _onInstall(info.installCommand);
    }
  });

  btnRow.appendChild(docsBtn);
  btnRow.appendChild(closeBtn);
  btnRow.appendChild(installBtn);

  card.appendChild(header);
  card.appendChild(desc);
  card.appendChild(cmdLabel);
  card.appendChild(cmdBox);
  card.appendChild(btnRow);
  overlay.appendChild(card);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}
