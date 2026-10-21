import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ageMs, leadFood, overweight, requirementMet, speciesName, SPECIES_BY_ID, type Pet } from '../core/pet';
import { SPECIES } from '../core/speciesData';
import type { Requirement, Stage } from '../core/types';
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

function Btn({ label, onPress, on, wide }: { label: string; onPress: () => void; on?: boolean; wide?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, on && s.btnOn, wide && { flexBasis: '100%' }, pressed && { opacity: 0.6 }]}>
      <Text style={[s.btnText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function DevPanel({ game, onClose }: { game: Game; onClose: () => void }) {
  const p = game.pet as Pet;
  const sp = SPECIES_BY_ID[p.species];
  const age = ageMs(p);
  const need = STAGE_HOURS[p.stage];
  const d = game.dev;
  return (
    <View style={s.backdrop}>
      <View style={s.card}>
        <View style={s.head}>
          <Text style={s.title}>Dev panel</Text>
          <Pressable onPress={onClose} style={s.close}><Text style={{ fontWeight: '800', color: '#fff' }}>Close</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={s.h}>Now</Text>
          <Text style={s.body}>
            {`Species: ${speciesName(p)} (${p.species || 'none'})   Stage: ${p.stage}\nAge: ${Math.floor(age / 86400000)}d ${Math.floor((age % 86400000) / H)}h ${Math.floor((age % H) / 60000)}m`
              + `${need ? `   (next evolution check at age ${need}h)` : ''}`
              + `\nStage counters: mistakes ${p.stageMistakes}, meat ${p.stageMeat}, veggies ${p.stageVeg}, pasta ${p.stagePasta}, trained ${p.stageTrain}, wins ${p.stageWins}`
              + `\nSmarts ${p.smarts}  Discipline ${p.discipline}  Weight ${p.weight}${overweight(p) ? ' (heavy)' : ''}  Diet lead: ${leadFood(p)}`
              + `\nHunger ${p.hunger}  Happy ${p.happy}  Poops ${p.poops}  Sick ${p.sick ? 'yes' : 'no'}  Temp ${p.temp}  Call ${p.call ?? 'none'}`
              + `\nClock offset: ${(game.offset / H).toFixed(1)}h   Mode: ${p.gentle ? 'gentle' : 'classic'}${p.paused ? ', vacation' : ''}`}
          </Text>

          <Text style={s.h}>Next evolutions</Text>
          {sp && sp.evolutions.length ? sp.evolutions.map((e, i) => {
            const met = requirementMet(e.req, p);
            return (
              <Text key={i} style={[s.body, met && { color: '#1b7a3a', fontWeight: '700' }]}>
                {`${met ? '[ok] ' : '[ ] '}${SPECIES_BY_ID[e.to]?.name ?? e.to}: ${reqText(e.req)}`}
              </Text>
            );
          }) : <Text style={s.body}>{p.stage === 'egg' ? 'Hatches into Pip or Nubb after 10 minutes.' : 'No further evolutions.'}</Text>}
          {sp && sp.evolutions.length > 0 && <Text style={s.small}>The first listed option whose requirements are met is chosen.</Text>}

          <Text style={s.h}>Time travel</Text>
          <View style={s.row}>
            <Btn label="Skip +1 hour" onPress={() => d.skip(H)} />
            <Btn label="+8 hours" onPress={() => d.skip(8 * H)} />
            <Btn label="+1 day" onPress={() => d.skip(24 * H)} />
            <Btn label="+3 days" onPress={() => d.skip(72 * H)} />
            <Btn label="To 9:00 (wake up)" onPress={() => d.skipToHour(9)} />
            <Btn label="To 22:00 (bedtime)" onPress={() => d.skipToHour(22)} />
          </View>

          <Text style={s.h}>State</Text>
          <View style={s.row}>
            <Btn label="Make hungry" onPress={d.makeHungry} />
            <Btn label="Make dirty" onPress={d.makeDirty} />
            <Btn label="Make sick" onPress={d.makeSick} />
            <Btn label="Heal all" onPress={d.healAll} />
            <Btn label="Reset (new egg)" onPress={d.reset} />
          </View>

          <Text style={s.h}>Modes</Text>
          <View style={s.row}>
            <Btn label={`Classic mode: ${p.gentle ? 'off' : 'ON'}`} on={!p.gentle} onPress={d.toggleClassic} />
            <Btn label={`Vacation: ${p.paused ? 'ON' : 'off'}`} on={p.paused} onPress={d.toggleVacation} />
            <Btn label={`Sound: ${game.muted ? 'muted' : 'on'}`} on={!game.muted} onPress={d.toggleMute} />
          </View>

          <Text style={s.h}>Force species</Text>
          {(['baby', 'child', 'teen', 'adult', 'ultimate'] as const).map((st) => (
            <View key={st} style={{ marginBottom: 6 }}>
              <Text style={s.small}>{st}</Text>
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
  backdrop: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(30,25,50,0.55)', alignItems: 'center', justifyContent: 'center', padding: 10, zIndex: 70 },
  card: { width: '100%', maxWidth: 440, maxHeight: '100%', backgroundColor: '#FFF9F0', borderRadius: 18, padding: 14, flexShrink: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '900', color: '#4A3A5E' },
  close: { backgroundColor: '#B9648F', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  h: { marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: '800', color: '#B9648F', textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontSize: 13, lineHeight: 19, color: '#3b3250' },
  small: { fontSize: 11, color: '#7a6f8c', marginBottom: 2, textTransform: 'capitalize' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: { backgroundColor: '#EADFF3', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  btnOn: { backgroundColor: '#4A3A5E' },
  btnText: { fontSize: 13, fontWeight: '700', color: '#4A3A5E' },
});
