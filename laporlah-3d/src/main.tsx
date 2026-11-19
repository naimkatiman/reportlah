import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/type.css';
import { App } from './app/App';
import { parseShot, shotNeedsPhoto, stateForShot } from './app/shots';
import { captureDrainSnapshot } from './app/snapshot';
import { createConnectedState, createInitialAppState, createStore } from './app/store';
import { createClient, ensureReport, probe } from './integration';

async function start(): Promise<void> {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root');
  const shot = parseShot(window.location.search);

  let initial = createInitialAppState();
  if (shot) {
    document.documentElement.dataset.shot = shot.name;
    // A preset jumps straight to its state. Non-walk presets need the frozen drain snapshot first.
    const photo = shotNeedsPhoto(shot) ? await captureDrainSnapshot().catch(() => '') : '';
    initial = stateForShot(shot, photo);
  }
  let store = createStore(initial);
  if (!shot) {
    // Served from Reportlah's own origin: use its live state when it answers, demo data otherwise.
    const client = createClient();
    const view = await probe(client);
    if (view) store = createStore(createConnectedState(await ensureReport(client, view)), { client });
  }
  createRoot(root).render(<App store={store} shot={shot} />);
}

void start();
