import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ageMs, leadFood, overweight, requirementMet, speciesName, SPECIES_BY_ID, type Pet } from '../core/pet';
import { SPECIES } from '../core/speciesData';
import type { Requirement, Stage } from '../core/types';
import { PixelButton, PixelText } from './PixelText';
import { useTheme } from './theme';
import type { useGame } from './useGame';

type Game = ReturnType<typeof useGame>;
const H = 3600000;
// mirrors STAGE_HOURS in pet.ts (absolute age at which a stage may evolve)
const STAGE_HOURS: Partial<Record<Stage, number>> = { baby: 8, child: 36, teen: 72, adult: 168 };

export function reqText(r: Requirement): string {
  const parts: string[] = [];
  if (r.mist_min !== undefined && r.mist_max !== undefined) parts.push(`${r.mist_min}-${r.mist_max} care mistakes`);
  else if (r.mist_min !== undefined) parts.push(`${r.mist_min}+ care mistakes`);
  else if (r.mist_max !== undefined) parts.push(`at most ${r.mist_max} care mistakes`);
  if (r.train) parts.push(`trained ${r.train}+ times`);
  if (r.wins) parts.push(`${r.wins}+ battle wins`);
  if (r.smarts) parts.push(`smarts ${r.smarts}+`);
  if (r.disc) parts.push(`discipline ${r.disc}+`);
  if (r.heavy) parts.push('overweight');
  if (r.lead) parts.push(`mostly ${r.lead === 'veggie' ? 'veggies' : r.lead}`);
  return parts.length ? parts.join(', ') : 'anything (fallback)';
}

function Btn({ label, onPress, on }: { label: string; onPress: () => void; on?: boolean }) {
  return <PixelButton label={label} onPress={onPress} on={on} ps={1.5} style={{ minHeight: 44, paddingHorizontal: 10 }} />;
}

export function DevPanel({ game, onClose }: { game: Game; onClose: () => void }) {
  const p = game.pet as Pet;
  const sp = SPECIES_BY_ID[p.species];
  const age = ageMs(p);
  const need = STAGE_HOURS[p.stage];
  const d = game.dev;
  const t = useTheme();
  const mono = Platform.select({ web: 'ui-monospace, Menlo, Consolas, monospace', default: 'Courier' });
  const body = [s.body, { color: t.ink, fontFamily: mono }];
  const h = [s.h, { color: t.ink, fontFamily: mono }];
  return (
    <View style={[s.backdrop, { backgroundColor: t.dark ? 'rgba(30,36,24,0.9)' : 'rgba(181,193,154,0.9)' }]}>
      <View style={[s.card, { backgroundColor: t.ground, borderColor: t.ink }]}>
        <View style={s.head}>
          <PixelText text="DEV PANEL" ps={3} color={t.ink} />
          <PixelButton label="CLOSE" ps={2} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={h}>Now</Text>
          <Text style={body}>
            {`Species: ${speciesName(p)} (${p.species || 'none'})   Stage: ${p.stage}\nAge: ${Math.floor(age / 86400000)}d ${Math.floor((age % 86400000) / H)}h ${Math.floor((age % H) / 60000)}m`
              + `${need ? `   (next evolution check at age ${need}h)` : ''}`
              + `\nStage counters: mistakes ${p.stageMistakes}, meat ${p.stageMeat}, veggies ${p.stageVeg}, pasta ${p.stagePasta}, trained ${p.stageTrain}, wins ${p.stageWins}`
              + `\nSmarts ${p.smarts}  Discipline ${p.discipline}  Weight ${p.weight}${overweight(p) ? ' (heavy)' : ''}  Diet lead: ${leadFood(p)}`
              + `\nHunger ${p.hunger}  Happy ${p.happy}  Poops ${p.poops}  Sick ${p.sick ? 'yes' : 'no'}  Temp ${p.temp}  Call ${p.call ?? 'none'}`
              + `\nClock offset: ${(game.offset / H).toFixed(1)}h   Mode: ${p.gentle ? 'gentle' : 'classic'}${p.paused ? ', vacation' : ''}`}
          </Text>

          <Text style={h}>Next evolutions</Text>
          {sp && sp.evolutions.length ? sp.evolutions.map((e, i) => {
            const met = requirementMet(e.req, p);
            return (
              <Text key={i} style={[body, met && { fontWeight: '900' }]}>
                {`${met ? '[x] ' : '[ ] '}${SPECIES_BY_ID[e.to]?.name ?? e.to}: ${reqText(e.req)}`}
              </Text>
            );
          }) : <Text style={body}>{p.stage === 'egg' ? 'Hatches into Pip or Nubb after 10 minutes.' : 'No further evolutions.'}</Text>}
          {sp && sp.evolutions.length > 0 && <Text style={[s.hint, { color: t.ink, fontFamily: mono }]}>The first listed option whose requirements are met is chosen.</Text>}

          <Text style={h}>Time travel</Text>
          <View style={s.row}>
            <Btn label="Skip +1 hour" onPress={() => d.skip(H)} />
            <Btn label="+8 hours" onPress={() => d.skip(8 * H)} />
            <Btn label="+1 day" onPress={() => d.skip(24 * H)} />
            <Btn label="+3 days" onPress={() => d.skip(72 * H)} />
            <Btn label="To 9:00 (wake up)" onPress={() => d.skipToHour(9)} />
            <Btn label="To 22:00 (bedtime)" onPress={() => d.skipToHour(22)} />
          </View>

          <Text style={h}>Away (while-you-were-away line)</Text>
          <View style={s.row}>
            <Btn label="Away 1 hour" onPress={() => d.away(H)} />
            <Btn label="Away 8 hours" onPress={() => d.away(8 * H)} />
          </View>

          <Text style={h}>Living scene</Text>
          <View style={s.row}>
            <Btn label="Fed meat" onPress={() => d.scene({ kind: 'fed', food: 'meat' })} />
            <Btn label="Fed veggie" onPress={() => d.scene({ kind: 'fed', food: 'veggie' })} />
            <Btn label="Fed pasta" onPress={() => d.scene({ kind: 'fed', food: 'pasta' })} />
            <Btn label="Snack" onPress={() => d.scene({ kind: 'snack' })} />
            <Btn label="Cleaned" onPress={() => d.scene({ kind: 'cleaned' })} />
            <Btn label="Medicine" onPress={() => d.scene({ kind: 'medicine' })} />
            <Btn label="Trained" onPress={() => d.scene({ kind: 'trained' })} />
            <Btn label="Battle win" onPress={() => d.scene({ kind: 'battle', win: true })} />
            <Btn label="Battle loss" onPress={() => d.scene({ kind: 'battle', win: false })} />
            <Btn label="Played (win)" onPress={() => d.scene({ kind: 'played', wins: 4 })} />
            <Btn label="Played (lose)" onPress={() => d.scene({ kind: 'played', wins: 1 })} />
            <Btn label="Climate cool" onPress={() => d.scene({ kind: 'climate', cool: true })} />
            <Btn label="Climate warm" onPress={() => d.scene({ kind: 'climate', cool: false })} />
            <Btn label="Light off" onPress={() => d.scene({ kind: 'light', on: false })} />
            <Btn label="Light on" onPress={() => d.scene({ kind: 'light', on: true })} />
            <Btn label="Petted" onPress={() => d.scene({ kind: 'petted' })} />
            <Btn label="Evolved" onPress={() => d.scene({ kind: 'evolved' })} />
            <Btn label="Hatched" onPress={() => d.scene({ kind: 'hatched' })} />
            <Btn label="Greet" onPress={() => d.scene({ kind: 'greet' })} />
            <Btn label="Make poop" onPress={d.makePoop} />
          </View>
          <Text style={[s.small, { color: t.ink, fontFamily: mono, marginTop: 6 }]}>Weather and hour</Text>
          <View style={s.row}>
            <Btn label={`Rain: ${game.forcedRain === null ? 'auto' : game.forcedRain ? 'ON' : 'off'}`} on={game.forcedRain === true}
              onPress={() => d.setRain(game.forcedRain === null ? true : game.forcedRain ? false : null)} />
            {([['Auto hour', null], ['Dawn 6', 6], ['Day 12', 12], ['Dusk 19', 19], ['Night 23', 23]] as const).map(([l, hr]) => (
              <Btn key={l} label={`${l}${game.forcedHour === hr ? ' *' : ''}`} on={game.forcedHour === hr} onPress={() => d.setHour(hr)} />
            ))}
          </View>

          <Text style={h}>State</Text>
          <View style={s.row}>
            <Btn label="Make hungry" onPress={d.makeHungry} />
            <Btn label="Make dirty" onPress={d.makeDirty} />
            <Btn label="Make sick" onPress={d.makeSick} />
            <Btn label="Heal all" onPress={d.healAll} />
            <Btn label="Reset (new egg)" onPress={d.reset} />
          </View>

          <Text style={h}>Modes</Text>
          <View style={s.row}>
            <Btn label={`Classic mode: ${p.gentle ? 'off' : 'ON'}`} on={!p.gentle} onPress={d.toggleClassic} />
            <Btn label={`Vacation: ${p.paused ? 'ON' : 'off'}`} on={p.paused} onPress={d.toggleVacation} />
            <Btn label={`Sound: ${game.muted ? 'muted' : 'on'}`} on={!game.muted} onPress={d.toggleMute} />
          </View>

          <Text style={h}>Force species</Text>
          {(['baby', 'child', 'teen', 'adult', 'ultimate'] as const).map((st) => (
            <View key={st} style={{ marginBottom: 6 }}>
              <Text style={[s.small, { color: t.ink, fontFamily: mono }]}>{st}</Text>
              <View style={s.row}>
                {SPECIES.filter((x) => x.stage === st).map((x) => (
                  <Btn key={x.id} label={x.name} on={p.species === x.id} onPress={() => d.force(x.id)} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', padding: 10, zIndex: 70 },
  card: { width: '100%', maxWidth: 440, maxHeight: '100%', borderWidth: 2, padding: 14, flexShrink: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  h: { marginTop: 14, marginBottom: 6, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontSize: 12.5, lineHeight: 18 },
  small: { fontSize: 11, opacity: 0.8, marginBottom: 2, textTransform: 'capitalize' },
  hint: { fontSize: 11, opacity: 0.8, marginTop: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
