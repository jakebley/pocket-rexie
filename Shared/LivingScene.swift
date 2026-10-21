import Foundation

// The behaviour director for the home scene. Pure and seeded: the same Pet seed, inputs and
// clock always give the same walk. No UIKit or SwiftUI, so it compiles on iOS, watchOS and in
// the widget. See docs/LIVING_SCENE.md.

/// What the pet is doing right now.
enum SceneAction: String, CaseIterable, Equatable {
    case idle, walk, look, hop, sit, eat, poop, dance, droop, shiver, sweat, sneeze, sleep
    case stretch, react, greet, train, battle, play
}

/// Something that just happened to the pet; the director animates it, then goes back to
/// autonomous behaviour.
enum SceneEvent: Equatable {
    case fed(Food)
    case snack
    case cleaned
    case medicine
    case trained
    case battle(win: Bool)
    case played(wins: Int)
    case climate
    case light
    case petted
    case evolved
    case hatched
    /// The player came back after a while: the pet runs in and waves.
    case returned
}

/// A tap on the scene, in LCD cells.
enum SceneTap: Equatable {
    case ground(x: Double)
    case sky
}

/// Everything the director needs besides the pet and the clock.
struct SceneInputs {
    var events: [SceneEvent] = []
    var tap: SceneTap?
    /// Freezes wandering and ambient motion; events still change the pose.
    var reducedMotion = false
    /// Rainy day: the pet sometimes sits and looks up.
    var raining = false
}

/// A short-lived prop or effect drawn by the renderer: falling food, a broom, a syringe...
struct SceneEffect: Equatable {
    enum Kind: CaseIterable, Equatable { case food, broom, syringe, foe, ball, puff, shell }

    var kind: Kind
    /// Tick at which the effect began (stamped by the director).
    var start = 0
    var duration = 0
    var x = 0.0
    var dir = 1
    var food: Food?
    /// Meaning per kind: food eaten, battle won, cool puff.
    var flag = false
    /// Poops that were on the ground when a broom started.
    var count = 0
    /// Lives until its script ends instead of for `duration` ticks.
    var bound = false

    /// Horizontal position (cells, left edge) of the bouncing ball `age` ticks in.
    static func ballX(age: Int) -> Double {
        min(27.0, max(0.0, Double(age) * 27.0 / 24.0))
    }
}

/// One step of a scripted reaction.
struct SceneStep: Equatable {
    var action: SceneAction
    /// Ticks to hold; 0 on a walk means "until it arrives".
    var ticks = 0
    var target: Double?
    var speedMul = 1.0
    var face: Int?
    var lookUp = false
    /// Pop a heart above the head when the step begins.
    var pop = false
    var fx: SceneEffect?
}

/// Tiny stateless hash used for every random choice, so scenes are reproducible.
enum SceneRNG {
    static func hash(_ a: UInt64, _ b: UInt64, _ c: UInt64 = 0) -> UInt64 {
        let k1: UInt64 = 0x9E37_79B9_7F4A_7C15
        let k2: UInt64 = 0xBF58_476D_1CE4_E5B9
        let k3: UInt64 = 0x94D0_49BB_1331_11EB
        var x: UInt64 = a &+ k1 &* (b &+ 1)
        x = x &+ k2 &* (c &+ 1)
        x = (x ^ (x >> 30)) &* k2
        x = (x ^ (x >> 27)) &* k3
        return x ^ (x >> 31)
    }

    static func bits(_ n: Int) -> UInt64 { UInt64(bitPattern: Int64(n)) }
}

/// The pet's life in the room. Call `step` every frame (about 8 times a second); it advances
/// in 125 ms ticks.
struct SceneState: Equatable {
    static let tickLength = 0.125
    static let minX = 0.0
    static let maxX = 16.0
    static let homeX = 8.0
    static let bedX = 4.0
    /// Ground x of the first, second and third poop.
    static let poopSpots: [Int] = [3, 11, 24]

    var action: SceneAction = .idle
    /// Left edge of the 16x16 sprite, in cells, 0...16.
    var x = SceneState.homeX
    /// +1 faces right (the sprite as drawn), -1 faces left.
    var facing = 1
    /// Last tick processed (`Int.min` before the first step).
    var tick = Int.min
    var actionAge = 0
    var ticksLeft = 0
    var targetX: Double?
    var speedMul = 1.0
    var lookUp = false
    var script: [SceneStep] = []
    var scripted = false
    var effect: SceneEffect?
    var pending: [SceneEvent] = []
    var pendingTap: SceneTap?
    /// Tick of the last heart pop above the head.
    var heartPop = -1000

    var poopsSeen: Int?
    var tempSeen = 0
    var asleepSeen = false
    var moodSeen = -1

    init() {}

    /// A frozen scene for still pictures (widget): the pet in the pose its state suggests.
    static func still(for pet: Pet) -> SceneState {
        var s = SceneState()
        s.tick = 0
        s.x = pet.asleep ? bedX : homeX
        if pet.stage == .egg || pet.stage == .ghost {
            s.action = .idle
        } else if pet.asleep {
            s.action = .sleep
        } else if pet.sick || pet.temp <= -2 {
            s.action = .shiver
        } else if pet.temp >= 2 {
            s.action = .sweat
        } else if pet.happy <= 1 {
            s.action = .droop
        }
        s.poopsSeen = pet.poops
        return s
    }

    /// Walking speed in cells per second.
    static func speed(for stage: Stage) -> Double {
        switch stage {
        case .baby: return 2.2
        case .child: return 3
        case .teen: return 3.5
        case .adult: return 3
        case .ultimate: return 2.5
        case .egg, .ghost: return 0
        }
    }

    // MARK: stepping

    mutating func step(pet: Pet, inputs: SceneInputs = SceneInputs(), now: Date) {
        for e in inputs.events {
            if e == .petted && pending.contains(.petted) { continue }
            pending.append(e)
        }
        if pending.count > 6 { pending.removeFirst(pending.count - 6) }
        if let t = inputs.tap { pendingTap = t }

        let target = Int((now.timeIntervalSinceReferenceDate / SceneState.tickLength).rounded(.down))
        if tick == Int.min || target - tick > 16 { tick = target - 1 }
        while tick < target {
            tick += 1
            advance(pet: pet, reduced: inputs.reducedMotion, raining: inputs.raining)
        }
    }

    /// Value-style stepping, handy for tests and previews.
    static func stepped(_ state: SceneState, pet: Pet, inputs: SceneInputs = SceneInputs(),
                        now: Date) -> SceneState {
        var s = state
        s.step(pet: pet, inputs: inputs, now: now)
        return s
    }

    private mutating func advance(pet: Pet, reduced: Bool, raining: Bool) {
        guard pet.stage != .egg, pet.stage != .ghost else {
            action = .idle; x = SceneState.homeX; facing = 1
            script = []; scripted = false; effect = nil; pending = []; pendingTap = nil
            ticksLeft = 0; actionAge = 0; targetX = nil
            poopsSeen = pet.poops; tempSeen = pet.temp; asleepSeen = pet.asleep
            return
        }
        if poopsSeen == nil { poopsSeen = pet.poops; tempSeen = pet.temp; asleepSeen = pet.asleep }
        x = min(max(x, SceneState.minX), SceneState.maxX)

        // A change of mood or of sleep re-plans the next autonomous action right away.
        var mood = 0
        if pet.sick { mood += 1 }
        if pet.temp >= 2 { mood += 2 }
        if pet.temp <= -2 { mood += 4 }
        if pet.hunger <= 1 { mood += 8 }
        if pet.happy <= 1 { mood += 16 }
        if mood != moodSeen || pet.asleep != asleepSeen {
            moodSeen = mood
            asleepSeen = pet.asleep
            if !scripted { ticksLeft = 0 }
        }
        if pet.asleep { pending.removeAll(); pendingTap = nil }

        if let tap = pendingTap {
            pendingTap = nil
            if !scripted { startTap(tap, reduced: reduced) }
        }
        if !scripted, !pending.isEmpty {
            let e = pending.removeFirst()
            startEvent(e, pet: pet, reduced: reduced)
        }
        handlePoops(pet: pet, reduced: reduced)

        if let e = effect, !e.bound, tick - e.start >= e.duration { effect = nil }
        if ticksLeft <= 0 { beginNext(pet: pet, reduced: reduced, raining: raining) }
        run(pet: pet, reduced: reduced)
        actionAge += 1
        ticksLeft -= 1
        tempSeen = pet.temp
    }

    // MARK: running the current action

    private mutating func run(pet: Pet, reduced: Bool) {
        switch action {
        case .walk:
            if !reduced, let t = targetX {
                move(toward: t, mul: speedMul, stops: true, stage: pet.stage)
            }
        case .play:
            if !reduced, let e = effect, e.kind == .ball {
                let bx = SceneEffect.ballX(age: tick - e.start)
                let t = min(max(bx - 8, SceneState.minX), SceneState.maxX)
                move(toward: t, mul: 1.5, stops: false, stage: pet.stage)
            }
        case .eat:
            if actionAge == 9, effect?.kind == .food { effect?.flag = true }
        default:
            break
        }
    }

    private mutating func move(toward t: Double, mul: Double, stops: Bool, stage: Stage) {
        let stepLen = SceneState.speed(for: stage) * mul * SceneState.tickLength
        let d = t - x
        if abs(d) <= stepLen {
            x = t
            if stops { targetX = nil; ticksLeft = 0 }
        } else {
            x += d > 0 ? stepLen : -stepLen
            facing = d > 0 ? 1 : -1
        }
        x = min(max(x, SceneState.minX), SceneState.maxX)
    }

    // MARK: choosing what to do

    private mutating func beginNext(pet: Pet, reduced: Bool, raining: Bool) {
        if !script.isEmpty {
            let s = script.removeFirst()
            apply(s, stage: pet.stage, reduced: reduced)
            return
        }
        if scripted {
            scripted = false
            if effect?.bound == true { effect = nil }
        }
        chooseAutonomous(pet: pet, reduced: reduced, raining: raining)
    }

    private mutating func apply(_ s: SceneStep, stage: Stage, reduced: Bool) {
        var step = s
        if reduced && step.action == .walk {
            step.action = .look
            step.target = nil
            step.ticks = 2
        }
        action = step.action
        actionAge = 0
        if let t = step.target {
            targetX = min(max(t, SceneState.minX), SceneState.maxX)
        } else {
            targetX = nil
        }
        speedMul = step.speedMul
        lookUp = step.lookUp
        if let f = step.face { facing = f }
        if step.action == .walk, let t = targetX, step.ticks <= 0 {
            ticksLeft = walkTicks(to: t, mul: step.speedMul, stage: stage)
        } else {
            ticksLeft = max(1, step.ticks)
        }
        if step.pop { heartPop = tick }
        if var f = step.fx {
            f.start = tick
            effect = f
        }
    }

    private func walkTicks(to t: Double, mul: Double, stage: Stage) -> Int {
        let stepLen = max(0.05, SceneState.speed(for: stage) * mul * SceneState.tickLength)
        return Int((abs(t - x) / stepLen).rounded(.up)) + 4
    }

    private mutating func hold(_ a: SceneAction, _ ticks: Int, lookUp up: Bool = false) {
        action = a
        ticksLeft = max(1, ticks)
        actionAge = 0
        targetX = nil
        speedMul = 1
        lookUp = up
    }

    private mutating func wander(to t: Double, mul: Double, pet: Pet, reduced: Bool, fallback: Int) {
        if reduced { hold(.idle, fallback); return }
        let tt = min(max(t, SceneState.minX), SceneState.maxX)
        action = .walk
        actionAge = 0
        targetX = tt
        speedMul = mul
        lookUp = false
        ticksLeft = walkTicks(to: tt, mul: mul, stage: pet.stage)
        if tt != x { facing = tt > x ? 1 : -1 }
    }

    private func pickTarget(_ r: Int) -> Double {
        var t = Double(r % 17)
        if abs(t - x) < 3 { t = x < 8 ? min(16, x + 6) : max(0, x - 6) }
        return t
    }

    private static func weighted(_ items: [(SceneAction, Int)], roll: Int) -> SceneAction {
        let total = items.reduce(0) { $0 + $1.1 }
        guard total > 0 else { return .idle }
        var n = roll % total
        for (a, w) in items {
            if n < w { return a }
            n -= w
        }
        return .idle
    }

    private mutating func chooseAutonomous(pet: Pet, reduced: Bool, raining: Bool) {
        let t = SceneRNG.bits(tick)
        let r1 = Int(SceneRNG.hash(pet.seed, t, 1) % 1000)
        let r2 = Int(SceneRNG.hash(pet.seed, t, 2) % 1000)
        let r3 = Int(SceneRNG.hash(pet.seed, t, 3) % 1000)
        let r4 = Int(SceneRNG.hash(pet.seed, t, 4) % 1000)
        let dur = 16 + r2 % 33          // 2 to 6 seconds

        if pet.asleep {
            if reduced || abs(x - SceneState.bedX) < 0.01 {
                if !reduced { x = SceneState.bedX }
                if pet.lightOn && r1 % 100 < 15 { facing = -facing }   // restless shift
                hold(.sleep, 48)
            } else {
                wander(to: SceneState.bedX, mul: 1, pet: pet, reduced: reduced, fallback: dur)
            }
            return
        }
        if pet.sick {
            let p = r1 % 100
            if p < 55 {
                hold(.shiver, dur)
            } else if p < 75 {
                hold(.sneeze, 8)
            } else {
                wander(to: pickTarget(r3), mul: 0.5, pet: pet, reduced: reduced, fallback: dur)
            }
            return
        }
        if pet.temp >= 2 && r1 % 100 < 70 { hold(.sweat, dur); return }
        if pet.temp <= -2 && r1 % 100 < 70 { hold(.shiver, dur); return }
        if pet.hunger <= 1 {
            let p = r1 % 100
            if p < 55 {
                wander(to: x < 8 ? 14 : 2, mul: 1, pet: pet, reduced: reduced, fallback: dur)
            } else if p < 85 {
                facing = r3 % 2 == 0 ? 1 : -1
                hold(.look, 12 + r2 % 12, lookUp: true)
            } else {
                hold(.idle, 8)
            }
            return
        }
        if pet.happy <= 1 {
            if r1 % 100 < 70 {
                hold(.droop, dur)
            } else {
                wander(to: pickTarget(r3), mul: 0.5, pet: pet, reduced: reduced, fallback: dur)
            }
            return
        }
        if reduced { hold(.idle, dur); return }
        if pet.happy == Pet.maxHearts && pet.hunger >= 3 {
            let p = r1 % 100
            if p < 35 { hold(.dance, 24); return }
            if p < 60 { hold(.hop, 10); return }
        }

        var weights: [(SceneAction, Int)]
        switch pet.stage {
        case .baby:
            weights = [(.idle, 20), (.walk, 45), (.look, 10), (.sit, 8), (.hop, 12), (.stretch, 5)]
        case .adult:
            weights = [(.idle, 38), (.walk, 30), (.look, 15), (.sit, 12), (.hop, 4), (.stretch, 5)]
        case .ultimate:
            weights = [(.idle, 45), (.walk, 25), (.look, 15), (.sit, 10), (.stretch, 5)]
        default:
            weights = [(.idle, 35), (.walk, 30), (.look, 15), (.sit, 10), (.hop, 10), (.stretch, 4)]
        }
        if raining {
            weights.append((.sit, 20))
            weights.append((.look, 15))
        }
        switch SceneState.weighted(weights, roll: r4) {
        case .walk:
            wander(to: pickTarget(r3), mul: 1, pet: pet, reduced: reduced, fallback: dur)
        case .look:
            facing = r3 % 2 == 0 ? 1 : -1
            hold(.look, 8 + r2 % 16, lookUp: raining)
        case .hop:
            hold(.hop, 5 * (1 + r2 % 2))
        case .sit:
            hold(.sit, dur)
        case .stretch:
            hold(.stretch, 8)
        default:
            hold(.idle, dur)
        }
    }

    // MARK: reactions

    private mutating func play(_ steps: [SceneStep]) {
        script = steps
        scripted = true
        ticksLeft = 0
    }

    private mutating func startTap(_ tap: SceneTap, reduced: Bool) {
        switch tap {
        case .ground(let gx):
            let t = min(max(gx - 8, SceneState.minX), SceneState.maxX)
            let face = gx >= t + 8 ? 1 : -1
            var steps: [SceneStep] = []
            if !reduced { steps.append(SceneStep(action: .walk, ticks: 0, target: t)) }
            steps.append(SceneStep(action: .look, ticks: 12, face: face))
            play(steps)
        case .sky:
            play([SceneStep(action: .look, ticks: 16, lookUp: true)])
        }
    }

    private mutating func startEvent(_ e: SceneEvent, pet: Pet, reduced: Bool) {
        switch e {
        case .fed(let food):
            startFeeding(food, reduced: reduced)
        case .snack:
            startFeeding(nil, reduced: reduced)
        case .cleaned:
            let before = poopsSeen ?? pet.poops
            poopsSeen = pet.poops
            play([SceneStep(action: .look, ticks: 12,
                            fx: SceneEffect(kind: .broom, duration: 12, count: before)),
                  SceneStep(action: .hop, ticks: 5)])
        case .medicine:
            play([SceneStep(action: .look, ticks: 10,
                            fx: SceneEffect(kind: .syringe, duration: 10, dir: facing)),
                  SceneStep(action: .react, ticks: 8),
                  SceneStep(action: .react, ticks: 6, pop: true)])
        case .trained:
            play([SceneStep(action: .train, ticks: 24)])
        case .battle(let win):
            var steps: [SceneStep] = []
            if !reduced { steps.append(SceneStep(action: .walk, ticks: 0, target: 0)) }
            steps.append(SceneStep(action: .battle, ticks: 26, face: 1,
                                   fx: SceneEffect(kind: .foe, duration: 26, flag: win)))
            steps.append(SceneStep(action: win ? .dance : .droop, ticks: 16))
            play(steps)
        case .played(let wins):
            let won = wins >= 3
            play([SceneStep(action: .play, ticks: 24, fx: SceneEffect(kind: .ball, duration: 24)),
                  SceneStep(action: won ? .dance : .sit, ticks: won ? 16 : 10, pop: won)])
        case .climate:
            let cool = tempSeen > 0
            play([SceneStep(action: .stretch, ticks: 16,
                            fx: SceneEffect(kind: .puff, duration: 16, flag: cool))])
        case .light:
            if pet.lightOn {
                play([SceneStep(action: .stretch, ticks: 6)])
            } else {
                play([SceneStep(action: .stretch, ticks: 8), SceneStep(action: .sit, ticks: 20)])
            }
        case .petted:
            play([SceneStep(action: .hop, ticks: 5, pop: true)])
        case .evolved:
            // The inverted evolution flash runs first and the director is not stepped during it.
            play([SceneStep(action: .greet, ticks: 20)])
        case .hatched:
            play([SceneStep(action: .idle, ticks: 32),
                  SceneStep(action: .hop, ticks: 10, fx: SceneEffect(kind: .shell, duration: 12)),
                  SceneStep(action: .react, ticks: 6, pop: true)])
        case .returned:
            if reduced {
                play([SceneStep(action: .greet, ticks: 20)])
            } else {
                let fromLeft = SceneRNG.hash(pet.seed, SceneRNG.bits(tick), 9) % 2 == 0
                x = fromLeft ? SceneState.minX : SceneState.maxX
                facing = fromLeft ? 1 : -1
                play([SceneStep(action: .walk, ticks: 0, target: SceneState.homeX, speedMul: 1.8),
                      SceneStep(action: .greet, ticks: 20)])
            }
        }
    }

    /// Food drops beside the pet, the pet walks to it and chomps three times.
    private mutating func startFeeding(_ food: Food?, reduced: Bool) {
        let toRight = x <= 8
        let reach = reduced ? 13.0 : 17.0
        let foodX: Double = toRight ? min(26.0, x + reach) : max(0.0, x - (reduced ? 3.0 : 10.0))
        let target: Double = toRight ? min(16.0, max(0.0, foodX - 13)) : min(16.0, foodX + 3)
        let face = toRight ? 1 : -1
        var steps = [SceneStep(action: .look, ticks: 12, face: face, lookUp: true,
                               fx: SceneEffect(kind: .food, x: foodX, food: food, bound: true))]
        if !reduced { steps.append(SceneStep(action: .walk, ticks: 0, target: target, face: face)) }
        steps.append(SceneStep(action: .eat, ticks: 12, face: face))
        steps.append(SceneStep(action: .react, ticks: 6, pop: true))
        play(steps)
    }

    /// A new poop: walk to its spot, squat, drop it.
    private mutating func handlePoops(pet: Pet, reduced: Bool) {
        guard let seen = poopsSeen, pet.poops != seen else { return }
        if pet.poops < seen {
            // Cleaned elsewhere; if our own cleaned event is waiting, keep the old count for the broom.
            if !pending.contains(.cleaned) { poopsSeen = pet.poops }
            return
        }
        if pet.asleep || pet.poops - seen > 1 { poopsSeen = pet.poops; return }
        if scripted { return }
        poopsSeen = pet.poops
        let spot = SceneState.poopSpots[max(0, min(pet.poops, 3) - 1)]
        var steps: [SceneStep] = []
        if !reduced {
            steps.append(SceneStep(action: .walk, ticks: 0, target: Double(spot) - 6))
        }
        steps.append(SceneStep(action: .poop, ticks: 8))
        play(steps)
    }
}

// MARK: - while you were away

enum AwaySummary {
    /// One line summarising what happened since `last`, or "<NAME> MISSED YOU" when nothing did.
    static func line(for pet: Pet, since last: Date, now: Date = Date()) -> String {
        let recent = pet.events.filter { $0.at > last && $0.at <= now }
        func count(_ kind: String) -> Int { recent.filter { $0.kind == kind }.count }
        var items: [String] = []
        if count("hatched") > 0 { items.append("HATCHED") }
        if let e = recent.last(where: { $0.kind == "evolved" }) {
            let name = Species.named(e.detail)?.name.uppercased() ?? "SOMETHING NEW"
            items.append("EVOLVED INTO \(name)")
        }
        if count("sleep") > 0 { items.append("SLEPT") }
        let messes = count("poop")
        if messes == 1 { items.append("MADE A MESS") } else if messes > 1 { items.append("MADE \(messes) MESSES") }
        if count("sick") > 0 { items.append("GOT SICK") }
        let calls = count("call")
        if calls == 1 { items.append("WANTED YOU") } else if calls > 1 { items.append("WANTED YOU \(calls) TIMES") }
        if count("died") > 0 { items.append("PASSED ON") }
        if items.isEmpty { return "\(pet.name.uppercased()) MISSED YOU" }

        let prefix = "WHILE YOU WERE AWAY: "
        var line = prefix + items[0]
        for item in items.dropFirst() where line.count + 2 + item.count <= 52 {
            line += ", " + item
        }
        return line
    }
}
