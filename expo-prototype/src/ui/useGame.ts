import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TICK, advance, battle, clean, climate, feed, feedSnack, finishPlay, forceSpecies, giveMedicine, needsAttention,
  newEgg, newPet, petIt, scold, speciesName, toggleLight, train, type Pet,
} from '../core/pet';
import { dexPageCount, statsPageCount, type Evo, type Mode, type PlayState } from './screens';
import * as sound from './sound';

const KEY = 'pocket-rexie-v1';
const clone = (p: Pet): Pet => JSON.parse(JSON.stringify(p));
const rnd9 = () => 1 + Math.floor(Math.random() * 9);
/** Shown digits stay in 2..8 so both HIGHER and LOWER can win. */
const rnd28 = () => 2 + Math.floor(Math.random() * 7);
export const DEV_HOUR = 3600000;

/** useState that also keeps a ref current synchronously (handlers never see stale values). */
function useRS<T>(init: T) {
  const [v, setV] = useState<T>(init);
  const ref = useRef<T>(init);
  const set = useCallback((n: T | ((o: T) => T)) => {
    const nv = typeof n === 'function' ? (n as (o: T) => T)(ref.current) : n;
    ref.current = nv;
    setV(nv);
  }, []);
  return [v, set, ref] as const;
}

export function useGame() {
  const [pet, setPetState] = useState<Pet | null>(null);
  const petRef = useRef<Pet | null>(null);
  const offsetRef = useRef(0);
  const [offset, setOffsetState] = useState(0);
  const [mode, setMode, modeRef] = useRS<Mode>('home');
  const [devOpen, setDevOpen] = useState(false);
  const [sel, setSel, selRef] = useRS(-1);
  const [feedSel, setFeedSel, feedSelRef] = useRS(0);
  const [statsPage, setStatsPage, statsPageRef] = useRS(0);
  const [dexPage, setDexPage, dexPageRef] = useRS(0);
  const [play, setPlay, playRef] = useRS<PlayState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [evo, setEvo] = useState<Evo | null>(null);
  const [muted, setMutedState] = useState(false);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = () => Date.now() + offsetRef.current;

  const say = useCallback((m: string, ms = 4000) => {
    setMsg(m);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), ms);
  }, []);

  const save = (p: Pet) => {
    AsyncStorage.setItem(KEY, JSON.stringify({ pet: p, offset: offsetRef.current })).catch(() => {});
  };

  /** Publish a new pet state: detects hatch / evolution / calls, then persists. */
  const commit = (p: Pet) => {
    const cur = petRef.current;
    if (cur) {
      if (cur.species === '' && p.species !== '' && cur.stage === 'egg') {
        say('IT HATCHED!', 5000); sound.evolveJingle();
      } else if (cur.species !== '' && p.species !== '' && cur.species !== p.species) {
        setEvo({ from: cur.species, to: p.species, until: Date.now() + 3000 });
        say(`${p.name.toUpperCase()} EVOLVED INTO ${speciesName(p).toUpperCase()}!`, 6000);
        sound.evolveJingle();
      }
      if (p.call && p.call !== cur.call && needsAttention(p)) sound.callJingle();
    }
    petRef.current = p;
    setPetState(p);
    save(p);
  };

  const mutate = (fn: (p: Pet) => string | void) => {
    const cur = petRef.current;
    if (!cur) return;
    const p = clone(cur);
    advance(p, now());
    const m = fn(p);
    commit(p);
    if (m) say(m);
  };

  // ---- load + tick ----
  useEffect(() => {
    let dead = false;
    (async () => {
      let p: Pet | null = null;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          offsetRef.current = typeof saved.offset === 'number' ? saved.offset : 0;
          setOffsetState(offsetRef.current);
          p = { ...newPet(now()), ...saved.pet } as Pet;
          advance(p, now());
        }
      } catch { /* start fresh */ }
      if (dead) return;
      if (!p) p = newPet(now());
      petRef.current = p;
      setPetState(p);
      save(p);
    })();
    const id = setInterval(() => {
      const cur = petRef.current;
      if (!cur) return;
      if (now() - cur.lastTick >= TICK || cur.paused) {
        const p = clone(cur);
        advance(p, now());
        if (p.lastTick !== cur.lastTick) commit(p);
      }
    }, 1000);
    return () => { dead = true; clearInterval(id); if (playTimer.current) clearTimeout(playTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- navigation ----
  const goHome = () => {
    if (playTimer.current) { clearTimeout(playTimer.current); playTimer.current = null; }
    setPlay(null); setMode('home');
  };

  const nextPage = () => {
    const p = petRef.current; if (!p) return;
    if (modeRef.current === 'stats') {
      if (statsPageRef.current + 1 < statsPageCount(p)) setStatsPage(statsPageRef.current + 1);
      else { setDexPage(0); setMode('dex'); }
    } else if (modeRef.current === 'dex') {
      if (dexPageRef.current + 1 < dexPageCount(p)) setDexPage(dexPageRef.current + 1);
      else goHome();
    }
  };

  const startPlay = () => {
    setPlay({ round: 1, shown: rnd28(), won: 0, phase: 'guess', sel: 0, revealed: null, correct: null });
    setMode('play');
  };

  const playGuess = () => {
    const pl = playRef.current;
    if (!pl || pl.phase !== 'guess') return;
    let rev = rnd9();
    while (rev === pl.shown) rev = rnd9();
    const correct = pl.sel === 0 ? rev > pl.shown : rev < pl.shown;
    if (!correct) sound.bad();
    setPlay({ ...pl, phase: 'reveal', revealed: rev, correct, won: pl.won + (correct ? 1 : 0) });
    playTimer.current = setTimeout(() => {
      const c = playRef.current;
      if (!c) return;
      if (c.round >= 5) {
        const won = c.won;
        goHome();
        mutate((p) => finishPlay(p, won));
      } else {
        setPlay({ round: c.round + 1, shown: rnd28(), won: c.won, phase: 'guess', sel: c.sel, revealed: null, correct: null });
      }
    }, 1400);
  };

  const confirmFeed = (i: number) => {
    if (i === 4) { goHome(); return; }
    goHome();
    mutate((p) => (i === 0 ? feed(p, 'meat') : i === 1 ? feed(p, 'veggie') : i === 2 ? feed(p, 'pasta') : feedSnack(p)));
  };

  const canAct = (p: Pet) => p.stage !== 'egg' && p.stage !== 'ghost';
  const perform = (i: number) => {
    const cur = petRef.current; if (!cur) return;
    switch (i) {
      case 0: case 2: {
        mutate((p) => {
          if (!canAct(p)) return '...';
          if (p.asleep) return `Shh, ${p.name} is asleep`;
          if (i === 0) { setFeedSel(0); setMode('feed'); } else startPlay();
        });
        break;
      }
      case 1: mutate(toggleLight); break;
      case 3: mutate(train); break;
      case 4: mutate(giveMedicine); break;
      case 5: mutate(clean); break;
      case 6: mutate(climate); break;
      case 7: mutate(scold); break;
      case 8: mutate(battle); break;
      case 9: setStatsPage(0); setMode('stats'); break;
    }
  };

  const pressA = () => {
    sound.beep();
    const m = modeRef.current;
    if (m === 'home') setSel((selRef.current + 1) % 10);
    else if (m === 'feed') setFeedSel((feedSelRef.current + 1) % 5);
    else if (m === 'play') { const pl = playRef.current; if (pl && pl.phase === 'guess') setPlay({ ...pl, sel: pl.sel === 0 ? 1 : 0 }); }
    else nextPage();
  };
  const pressB = () => {
    sound.beep();
    const m = modeRef.current;
    if (m === 'home') { if (selRef.current >= 0) perform(selRef.current); else say('Press A to pick an icon'); }
    else if (m === 'feed') confirmFeed(feedSelRef.current);
    else if (m === 'play') playGuess();
    else nextPage();
  };
  const pressC = () => {
    sound.beep();
    if (modeRef.current === 'home') setSel(-1); else { goHome(); setSel(-1); }
  };
  const selectIcon = (i: number) => {
    sound.beep();
    if (modeRef.current !== 'home') goHome();
    setSel(i);
    perform(i);
  };
  const tapFeedRow = (i: number) => { sound.beep(); setFeedSel(i); confirmFeed(i); };
  const tapPlayOption = (i: 0 | 1) => {
    const pl = playRef.current;
    if (!pl || pl.phase !== 'guess') return;
    sound.beep();
    setPlay({ ...pl, sel: i });
    playRef.current = { ...pl, sel: i };
    playGuess();
  };
  const tapScreen = () => {
    const m = modeRef.current;
    if (m === 'home') { sound.beep(); mutate(petIt); }
    else if (m === 'stats' || m === 'dex') { sound.beep(); nextPage(); }
  };

  const setName = (n: string) => mutate((p) => { p.name = n.trim().slice(0, 10) || 'Rexie'; p.named = true; return `Hi, ${p.name}!`; });
  const hatchNew = () => { const cur = petRef.current; if (cur) { commit(newEgg(cur, now())); say('A new egg!'); goHome(); setSel(-1); } };

  // ---- dev ----
  const dev = useMemo(() => ({
    skip: (ms: number) => {
      offsetRef.current += ms; setOffsetState(offsetRef.current);
      mutate(() => {});
    },
    skipToHour: (h: number) => {
      const n = new Date(now());
      const t = new Date(n); t.setHours(h, 0, 0, 0);
      if (t.getTime() <= n.getTime()) t.setDate(t.getDate() + 1);
      offsetRef.current += t.getTime() - n.getTime(); setOffsetState(offsetRef.current);
      mutate(() => {});
    },
    makeHungry: () => mutate((p) => { p.hunger = 0; p.call = null; return 'Made hungry'; }),
    makeDirty: () => mutate((p) => { p.poops = 3; p.poopProgress = 0; return 'Made dirty'; }),
    makeSick: () => mutate((p) => { p.sick = true; p.medDoses = 0; return 'Made sick'; }),
    healAll: () => mutate((p) => {
      p.hunger = 4; p.happy = 4; p.poops = 0; p.sick = false; p.medDoses = 0; p.temp = 0;
      p.starveTicks = 0; p.sickTicks = 0; p.lightTicks = 0; p.call = null; p.callSince = null;
      return 'Healed all';
    }),
    reset: () => {
      const cur = petRef.current;
      offsetRef.current = 0; setOffsetState(0);
      commit(newPet(Date.now(), { gentle: cur?.gentle ?? true }));
      goHome(); setSel(-1); say('New egg');
    },
    toggleClassic: () => mutate((p) => { p.gentle = !p.gentle; return p.gentle ? 'Gentle mode' : 'Classic mode'; }),
    toggleVacation: () => mutate((p) => { p.paused = !p.paused; return p.paused ? 'Vacation on' : 'Vacation off'; }),
    force: (id: string) => mutate((p) => { forceSpecies(p, id); }),
    toggleMute: () => { const m = !sound.isMuted(); sound.setMuted(m); setMutedState(m); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const needsName = !!pet && pet.stage !== 'egg' && pet.stage !== 'ghost' && !pet.named;

  return {
    ready: pet !== null, pet, mode, sel, feedSel, statsPage, dexPage, play, msg, evo, offset, muted, devOpen, setDevOpen,
    needsName, setName, hatchNew,
    pressA, pressB, pressC, selectIcon, tapFeedRow, tapPlayOption, tapScreen, dev,
    now,
  };
}
