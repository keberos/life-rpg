import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { STAT_IDS, type StatId } from '../src/engine/types.ts';
import { grantStarterKit } from './state/logic.ts';
import { store, useGame } from './state/store.ts';
// Fonts are bundled with the app (no third-party requests from the phone).
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './styles.css';
import { BossScreen } from './ui/BossScreen.tsx';
import { Equipment } from './ui/Equipment.tsx';
import { Guide, StatScreen } from './ui/Help.tsx';
import { Home } from './ui/Home.tsx';
import { CheckIn, Debug, Intercept, Menu, SaveScreen, ShortcutGuide, Skipped } from './ui/Menu.tsx';
import { QuestScreen } from './ui/QuestScreen.tsx';
import { SeasonScreen } from './ui/SeasonScreen.tsx';

function useHash() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    const on = () => {
      setHash(location.hash || '#/');
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function App() {
  useGame(); // re-render on save changes
  const hash = useHash();
  const parts = hash.replace(/^#\/?/, '').split('/');
  const [route, arg, arg2] = parts;

  switch (route) {
    case 'quest': {
      // #/quest, #/quest/STR, #/quest/id/<questId>
      if (arg === 'id') return <QuestScreen key={hash} questId={arg2} />;
      const stat = STAT_IDS.includes(arg as StatId) ? (arg as StatId) : undefined;
      return <QuestScreen key={hash} stat={stat} />;
    }
    case 'boss': return <BossScreen />;
    case 'gear': return <Equipment />;
    case 'season': return <SeasonScreen />;
    case 'help': return <Guide topic={arg} />;
    case 'stat': return STAT_IDS.includes(arg as StatId) ? <StatScreen stat={arg as StatId} /> : <Home />;
    case 'menu': return <Menu />;
    case 'checkin': return <CheckIn />;
    case 'shortcut': return <ShortcutGuide />;
    case 'intercept': return <Intercept />;
    case 'skipped': return <Skipped />;
    case 'save': return <SaveScreen />;
    case 'debug': return <Debug />;
    default: return <Home />;
  }
}

// Drop-in start: no setup screens. First open just gets the starter kit.
if (!store.get().profile.onboarded) grantStarterKit();

render(<App />, document.getElementById('app')!);
