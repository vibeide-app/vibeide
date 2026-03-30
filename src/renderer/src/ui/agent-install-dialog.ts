import type { AgentInstallInfo } from '../../../shared/agent-install-info';
import { createAgentIcon } from './agent-icons';
import type { AgentType } from '../../../shared/agent-types';

export type InstallCallback = (installCommand: string) => void;
export type DialogCloseCallback = () => void;

let _onInstall: InstallCallback | null = null;
let _onDialogClose: DialogCloseCallback | null = null;

export function setInstallCallback(cb: InstallCallback): void {
  _onInstall = cb;
}

export function setDialogCloseCallback(cb: DialogCloseCallback): void {
  _onDialogClose = cb;
}

function removeDialog(overlay: HTMLElement): void {
  overlay.remove();
  if (_onDialogClose) _onDialogClose();
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
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Agent Installation');
  card.setAttribute('aria-modal', 'true');

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
  docsBtn.className = 'agent-install-docs-btn btn-secondary';
  docsBtn.textContent = 'View Docs';
  docsBtn.href = info.docsUrl;
  docsBtn.target = '_blank';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'agent-install-close-btn btn-secondary';
  closeBtn.textContent = 'Close';
  closeBtn.setAttribute('aria-label', 'Close install dialog');
  closeBtn.addEventListener('click', () => removeDialog(overlay));

  const installBtn = document.createElement('button');
  installBtn.className = 'agent-install-run-btn btn-primary';
  installBtn.textContent = 'Install';
  installBtn.setAttribute('aria-label', 'Install agent');
  installBtn.addEventListener('click', () => {
    removeDialog(overlay);
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
    if (e.target === overlay) removeDialog(overlay);
  });

  document.body.appendChild(overlay);
}
