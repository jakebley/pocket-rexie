import Foundation

enum Stage: String, Codable { case egg, baby, child, teen, adult, ultimate, ghost }
enum Food: String, Codable, CaseIterable { case meat, veggie, pasta }
enum Call: String, Codable { case hungry, bored, poop, sick, naughty, light, hot, cold }

/// The whole game state. It is a pure function of (state, elapsed time): `advance(to:)`
/// replays 5-minute ticks with a seeded RNG, so the app, widget and watch agree.
struct Pet: Codable, Equatable {
    static let tick: TimeInterval = 300
    static let maxHearts = 4
    /// Hours of age at which each stage ends and an evolution is checked (at the next wake-up).
    static let stageHours: [Stage: Double] = [.baby: 8, .child: 36, .teen: 72, .adult: 168]

    var name = "Rexie"
    var named = false
    var seed: UInt64 = 1
    var generation = 1
    var birth: Date
    var lastTick: Date
    var modified: Date
    var stage: Stage = .egg
    /// Id of the current `Species`; empty while an egg.
    var species = ""
    /// Ids of every species this player has raised, across generations.
    var dex: [String] = []

    var hunger = 4
    var happy = 4
    var weight = 5
    var smarts = 0
    var discipline = 0
    var poops = 0
    var sick = false
    var medDoses = 0
    var asleep = false
    var lightOn = true
    var careMistakes = 0
    var gentle = true
    var paused = false
    /// -2 cold ... +2 hot. Zero is a comfy 25 C.
    var temp = 0

    // Lifetime totals
    var dietMeat = 0
    var dietVeg = 0
    var dietPasta = 0
    var trains = 0
    var battles = 0
    var wins = 0

    // Counters for the current stage; evolution branches look at these, then they reset.
    var stageMistakes = 0
    var stageMeat = 0
    var stageVeg = 0
    var stagePasta = 0
    var stageTrain = 0
    var stageWins = 0

    var lastTrain: Date?
    var lastBattle: Date?

    var call: Call?
    var callSince: Date?
    var callMistaken = false

    var hungerProgress = 0
    var happyProgress = 0
    var poopProgress = 0
    var tempProgress = 0
    var petProgress = 0
    var starveTicks = 0
    var sickTicks = 0
    var lightTicks = 0
    var napMistaken = false

    var diedAt: Date?
    var causeOfDeath: String?
    var legacy: [String] = []

    init(now: Date = Date(), generation: Int = 1, name: String = "Rexie", legacy: [String] = [],
         gentle: Bool = true, dex: [String] = []) {
        self.birth = now; self.lastTick = now; self.modified = now
        self.generation = generation; self.name = name; self.legacy = legacy
        self.gentle = gentle; self.dex = dex
        // Kept small so JSON round-trips it exactly on every platform.
        self.seed = UInt64.random(in: 1...UInt64(Int32.max))
    }

    /// Tolerant decoding: a save written by an older version (missing newer fields) still loads,
    /// with defaults filling the gaps, instead of resetting the pet.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let birthDate = try c.decodeIfPresent(Date.self, forKey: .birth) ?? Date()
        self.init(now: birthDate)
        if let v = try c.decodeIfPresent(String.self, forKey: .name) { name = v }
        if let v = try c.decodeIfPresent(Bool.self, forKey: .named) { named = v }
        if let v = try c.decodeIfPresent(UInt64.self, forKey: .seed) { seed = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .generation) { generation = v }
        if let v = try c.decodeIfPresent(Date.self, forKey: .birth) { birth = v }
        if let v = try c.decodeIfPresent(Date.self, forKey: .lastTick) { lastTick = v }
        if let v = try c.decodeIfPresent(Date.self, forKey: .modified) { modified = v }
        if let v = try c.decodeIfPresent(Stage.self, forKey: .stage) { stage = v }
        if let v = try c.decodeIfPresent(String.self, forKey: .species) { species = v }
        if let v = try c.decodeIfPresent([String].self, forKey: .dex) { dex = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .hunger) { hunger = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .happy) { happy = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .weight) { weight = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .smarts) { smarts = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .discipline) { discipline = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .poops) { poops = v }
        if let v = try c.decodeIfPresent(Bool.self, forKey: .sick) { sick = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .medDoses) { medDoses = v }
        if let v = try c.decodeIfPresent(Bool.self, forKey: .asleep) { asleep = v }
        if let v = try c.decodeIfPresent(Bool.self, forKey: .lightOn) { lightOn = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .careMistakes) { careMistakes = v }
        if let v = try c.decodeIfPresent(Bool.self, forKey: .gentle) { gentle = v }
        if let v = try c.decodeIfPresent(Bool.self, forKey: .paused) { paused = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .temp) { temp = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .dietMeat) { dietMeat = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .dietVeg) { dietVeg = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .dietPasta) { dietPasta = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .trains) { trains = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .battles) { battles = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .wins) { wins = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .stageMistakes) { stageMistakes = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .stageMeat) { stageMeat = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .stageVeg) { stageVeg = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .stagePasta) { stagePasta = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .stageTrain) { stageTrain = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .stageWins) { stageWins = v }
        lastTrain = try c.decodeIfPresent(Date.self, forKey: .lastTrain)
        lastBattle = try c.decodeIfPresent(Date.self, forKey: .lastBattle)
        call = try c.decodeIfPresent(Call.self, forKey: .call)
        callSince = try c.decodeIfPresent(Date.self, forKey: .callSince)
        if let v = try c.decodeIfPresent(Bool.self, forKey: .callMistaken) { callMistaken = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .hungerProgress) { hungerProgress = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .happyProgress) { happyProgress = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .poopProgress) { poopProgress = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .tempProgress) { tempProgress = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .petProgress) { petProgress = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .starveTicks) { starveTicks = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .sickTicks) { sickTicks = v }
        if let v = try c.decodeIfPresent(Int.self, forKey: .lightTicks) { lightTicks = v }
        if let v = try c.decodeIfPresent(Bool.self, forKey: .napMistaken) { napMistaken = v }
        diedAt = try c.decodeIfPresent(Date.self, forKey: .diedAt)
        causeOfDeath = try c.decodeIfPresent(String.self, forKey: .causeOfDeath)
        if let v = try c.decodeIfPresent([String].self, forKey: .legacy) { legacy = v }
        if seed == 0 { seed = 1 }
    }

    // MARK: derived

    var age: TimeInterval { lastTick.timeIntervalSince(birth) }
    var ageDays: Int { Int(age / 86400) }
    var isAlive: Bool { stage != .ghost }
    var needsAttention: Bool { call != nil && !asleep || call == .light }
    var speciesInfo: Species? { Species.named(species) }
    var speciesName: String { speciesInfo?.name ?? (stage == .egg ? "Egg" : "Dino") }

    var baseWeight: Int {
        switch stage {
        case .egg: return 3
        case .baby: return 5
        case .child: return 12
        case .teen: return 20
        case .adult: return 30
        case .ultimate: return 40
        case .ghost: return 0
        }
    }
    var overweight: Bool { weight >= baseWeight + 8 }

    /// The food eaten most during this stage. Ties go meat, then veggies, then pasta.
    var leadFood: Food {
        if stageMeat >= stageVeg && stageMeat >= stagePasta { return .meat }
        return stageVeg >= stagePasta ? .veggie : .pasta
    }

    /// The diet the pet is already on, so one-tap feeding keeps its evolution path.
    var preferredFood: Food { leadFood }

    var statusLine: String {
        if stage == .ghost { return "\(name) has passed on" }
        if paused { return "\(name) is on vacation" }
        if stage == .egg { return "An egg is warming up" }
        if asleep { return "\(name) is sleeping" }
        switch call {
        case .hungry: return "\(name) is hungry"
        case .bored: return "\(name) wants to play"
        case .poop: return "\(name) made a mess"
        case .sick: return "\(name) is sick"
        case .naughty: return "\(name) is being naughty"
        case .hot: return "\(name) is too warm"
        case .cold: return "\(name) is cold"
        case .light, .none: return "\(name) is doing fine"
        }
    }

    // MARK: simulation

    mutating func advance(to now: Date, calendar: Calendar = .current) {
        guard now > lastTick else { return }
        guard stage != .ghost else { lastTick = now; return }
        if paused {
            let gap = now.timeIntervalSince(lastTick)
            birth = birth.addingTimeInterval(gap)
            if let s = callSince { callSince = s.addingTimeInterval(gap) }
            lastTick = now
            return
        }
        var t = lastTick
        var steps = 0
        while t.addingTimeInterval(Pet.tick) <= now {
            if steps >= 8640 { t = now; break }
            t = t.addingTimeInterval(Pet.tick)
            step(at: t, calendar: calendar)
            steps += 1
            if stage == .ghost { break }
        }
        lastTick = t
    }

    private func rand(_ t: Date, _ salt: UInt64) -> UInt64 {
        var x = seed &+ UInt64(bitPattern: Int64(t.timeIntervalSince1970 / Pet.tick)) &* 0x9E3779B97F4A7C15 &+ salt &* 0xBF58476D1CE4E5B9
        x = (x ^ (x >> 30)) &* 0xBF58476D1CE4E5B9
        x = (x ^ (x >> 27)) &* 0x94D049BB133111EB
        return x ^ (x >> 31)
    }

    private func roll(_ t: Date, _ salt: UInt64, _ mod: UInt64) -> Bool {
        rand(t, salt) % mod == 0
    }

    private mutating func mistake() {
        careMistakes += 1
        stageMistakes += 1
    }

    private mutating func step(at t: Date, calendar: Calendar) {
        let age = t.timeIntervalSince(birth)
        if stage == .egg {
            if age >= 10 * 60 { hatch() }
            return
        }

        let hour = calendar.component(.hour, from: t)
        let shouldSleep = hour >= 21 || hour < 8
        if shouldSleep && !asleep { asleep = true; lightOn = true; lightTicks = 0; napMistaken = false }
        if !shouldSleep && asleep { asleep = false; lightOn = true; lightTicks = 0 }

        if asleep {
            if lightOn {
                lightTicks += 1
                if lightTicks >= 6 && !napMistaken {
                    mistake(); napMistaken = true; sick = true; medDoses = 0
                }
            }
            refreshCall(at: t)
            return
        }

        // Growth is checked once awake, like the original's morning check.
        checkEvolution(age: age)

        let rate = stage == .baby ? 16 : 24
        hungerProgress += 1
        if hungerProgress >= rate { hunger = max(0, hunger - 1); hungerProgress = 0 }
        happyProgress += 1
        if happyProgress >= rate + 4 { happy = max(0, happy - 1); happyProgress = 0 }
        poopProgress += 1
        if poopProgress >= 48 && poops < 3 { poops += 1; poopProgress = 0 }

        // The room warms up in the afternoon and cools in the morning and evening.
        tempProgress += 1
        if tempProgress >= 24 && roll(t, 6, 2) {
            let drift = (hour >= 12 && hour < 18) ? 1 : -1
            temp = max(-2, min(2, temp + drift))
            tempProgress = 0
        }

        if !sick {
            if (poops >= 2 && roll(t, 1, 70)) || (hunger == 0 && roll(t, 2, 90))
                || (overweight && roll(t, 3, 120)) || (abs(temp) >= 2 && roll(t, 5, 100)) {
                sick = true; medDoses = 0
            }
        }

        if hunger == 0 { starveTicks += 1 } else { starveTicks = max(0, starveTicks - 1) }
        if sick { sickTicks += 1 } else { sickTicks = 0 }

        if starveTicks >= 144 || sickTicks >= 144 {
            if gentle {
                starveTicks = 0; sickTicks = 0; sick = false; hunger = 2; happy = 2; mistake()
            } else {
                die(at: t, cause: starveTicks >= 144 ? "went hungry too long" : "was sick too long")
                return
            }
        }
        if age > 21 * 86400 && stage == .ultimate {
            retire(at: t)
            return
        }

        if call == nil && hunger >= 2 && happy >= 2 && !sick && roll(t, 4, 220) {
            call = .naughty; callSince = t; callMistaken = false
        }
        refreshCall(at: t)
    }

    private func conditionHolds(_ c: Call) -> Bool {
        switch c {
        case .hungry: return hunger <= 1
        case .bored: return happy <= 1
        case .poop: return poops >= 2
        case .sick: return sick
        case .naughty: return true
        case .light: return asleep && lightOn && lightTicks >= 3
        case .hot: return temp >= 2
        case .cold: return temp <= -2
        }
    }

    private mutating func refreshCall(at t: Date) {
        if let c = call {
            if c != .naughty && !conditionHolds(c) { call = nil; callSince = nil; callMistaken = false }
        }
        if call == nil {
            let order: [Call] = asleep ? [.light] : [.sick, .hungry, .hot, .cold, .poop, .bored]
            for c in order where conditionHolds(c) { call = c; callSince = t; callMistaken = false; break }
        }
        if let since = callSince, call != nil, !callMistaken, t.timeIntervalSince(since) >= 1800, call != .light {
            mistake(); callMistaken = true
        }
    }

    // MARK: growth

    private mutating func hatch() {
        let id = SpeciesData.babies[Int(seed % UInt64(SpeciesData.babies.count))]
        evolve(to: id)
        hunger = 4; happy = 4
    }

    private mutating func checkEvolution(age: TimeInterval) {
        guard let hours = Pet.stageHours[stage], age >= hours * 3600,
              let next = speciesInfo?.nextBranch(for: self) else { return }
        evolve(to: next)
    }

    private mutating func evolve(to id: String) {
        guard let sp = Species.named(id) else { return }
        species = id
        stage = sp.stage
        weight = max(weight, baseWeight)
        stageMistakes = 0; stageMeat = 0; stageVeg = 0; stagePasta = 0; stageTrain = 0; stageWins = 0
        if !dex.contains(id) { dex.append(id) }
    }

    private mutating func die(at t: Date, cause: String) {
        stage = .ghost; diedAt = t; causeOfDeath = cause; call = nil; sick = false
        legacy.append("\(name) the \(speciesName): \(ageDays)d, \(cause)")
    }

    private mutating func retire(at t: Date) {
        stage = .ghost; diedAt = t; causeOfDeath = "lived a full, happy life"; call = nil; sick = false
        legacy.append("\(name) the \(speciesName): \(ageDays)d, a full happy life")
    }

    // MARK: actions (call advance(to:) first)

    private var canAct: Bool { !asleep && stage != .egg && stage != .ghost }

    mutating func feed(_ food: Food) -> String {
        guard stage != .egg, stage != .ghost else { return "..." }
        if asleep { return "Shh, \(name) is asleep" }
        if hunger >= Pet.maxHearts { return "\(name) is full" }
        hunger += 1; weight += 1; starveTicks = 0; modified = lastTick
        switch food {
        case .meat: dietMeat += 1; stageMeat += 1
        case .veggie: dietVeg += 1; stageVeg += 1
        case .pasta: dietPasta += 1; stagePasta += 1
        }
        refreshCall(at: lastTick)
        return "Yum!"
    }

    mutating func feedMeal() -> String { feed(preferredFood) }

    mutating func feedSnack() -> String {
        guard stage != .egg, stage != .ghost else { return "..." }
        if asleep { return "Shh, \(name) is asleep" }
        if happy >= Pet.maxHearts { return "\(name) is too happy to eat" }
        happy += 1; weight += 2; modified = lastTick
        refreshCall(at: lastTick)
        return "Sweet!"
    }

    mutating func finishPlay(wins played: Int) -> String {
        guard canAct else { return "..." }
        modified = lastTick
        weight = max(baseWeight - 2, weight - 1)
        if played >= 3 {
            happy = min(Pet.maxHearts, happy + 1)
            smarts = min(100, smarts + 3)
            return "You won \(played) of 5!"
        }
        return "You won \(played) of 5. Try again!"
    }

    mutating func giveMedicine() -> String {
        guard canAct else { return "..." }
        modified = lastTick
        guard sick else { return "\(name) is not sick" }
        medDoses += 1
        if medDoses >= 2 { sick = false; medDoses = 0; sickTicks = 0; refreshCall(at: lastTick); return "\(name) feels better!" }
        return "One more dose"
    }

    mutating func clean() -> String {
        guard stage != .egg, stage != .ghost else { return "..." }
        modified = lastTick
        if poops == 0 { return "Already clean" }
        poops = 0; poopProgress = 0
        refreshCall(at: lastTick)
        return "Squeaky clean"
    }

    mutating func study() -> String {
        guard canAct, !sick, stage != .baby else { return "Not now" }
        modified = lastTick
        smarts = min(100, smarts + 6)
        return "\(name) learned something"
    }

    /// Air conditioner: brings the room back to a comfy 25 C from hot or cold.
    mutating func climate() -> String {
        guard canAct else { return "..." }
        modified = lastTick
        if temp == 0 { return "Already comfy" }
        let msg = temp > 0 ? "Ahh, nice and cool" : "Toasty warm now"
        temp = 0; tempProgress = 0
        refreshCall(at: lastTick)
        return msg
    }

    mutating func scold() -> String {
        guard canAct else { return "..." }
        modified = lastTick
        if call == .naughty { call = nil; callSince = nil; discipline = min(100, discipline + 25); return "\(name) behaves" }
        return "\(name) looks confused"
    }

    mutating func pet() -> String {
        guard canAct else { return "..." }
        modified = lastTick
        petProgress += 1
        smarts = min(100, smarts + 1)
        if petProgress >= 3 { petProgress = 0; if happy < Pet.maxHearts { happy += 1 } }
        return "\(name) purrs. Dinos can purr."
    }

    mutating func toggleLight() -> String {
        guard stage != .egg, stage != .ghost else { return "..." }
        modified = lastTick
        lightOn.toggle()
        if !lightOn { lightTicks = 0 }
        refreshCall(at: lastTick)
        return lightOn ? "Lights on" : "Lights off"
    }

    /// Workout: builds strength for battles and unlocks power-based evolutions.
    mutating func train() -> String {
        guard canAct else { return "..." }
        if stage == .baby { return "\(name) is too little" }
        if sick { return "\(name) is too sick" }
        if hunger == 0 { return "\(name) is too hungry" }
        if let l = lastTrain, lastTick.timeIntervalSince(l) < 900 { return "\(name) needs a rest" }
        lastTrain = lastTick; modified = lastTick
        trains += 1; stageTrain += 1
        weight = max(baseWeight - 2, weight - 1)
        return "Good workout!"
    }

    /// Spar with a wild dino. Training, smarts and discipline tip the odds.
    mutating func battle() -> String {
        guard canAct else { return "..." }
        if stage == .baby { return "\(name) is too little" }
        if sick { return "\(name) is too sick" }
        if hunger == 0 { return "\(name) is too hungry" }
        if let l = lastBattle, lastTick.timeIntervalSince(l) < 1800 { return "\(name) needs a rest" }
        lastBattle = lastTick; modified = lastTick
        battles += 1
        let level: Int
        switch stage { case .child: level = 1; case .teen: level = 2; case .adult: level = 3; default: level = 4 }
        let mine = level * 10 + min(trains, 25) * 2 + smarts / 10 + discipline / 10
        let theirs = level * 10 + Int(rand(lastTick, 100 + UInt64(battles)) % 30)
        let edge = Int(rand(lastTick, 200 + UInt64(battles)) % 15)
        let foes = ["a grumpy Pterodactyl", "a wild Raptor", "a big Ankylo", "a sneaky Compy", "a loud Parasaur"]
        let foe = foes[Int(rand(lastTick, 300 + UInt64(battles)) % UInt64(foes.count))]
        weight = max(baseWeight - 2, weight - 1)
        if mine + edge >= theirs {
            wins += 1; stageWins += 1
            happy = min(Pet.maxHearts, happy + 1)
            return "\(name) beat \(foe)!"
        }
        happy = max(0, happy - 1)
        return "\(foe) won. Train more!"
    }

    /// Start over with a fresh egg, keeping the memorial list and the Dex.
    mutating func newEgg(now: Date) {
        self = Pet(now: now, generation: generation + 1, name: name, legacy: legacy, gentle: gentle, dex: dex)
        named = false
    }

    /// First time this call would fire, for scheduling notifications.
    func nextCall(within hours: Double = 48, calendar: Calendar = .current) -> (Date, Call)? {
        guard !paused else { return nil }
        var p = self
        let end = lastTick.addingTimeInterval(hours * 3600)
        var t = lastTick
        while t < end && p.isAlive {
            t = t.addingTimeInterval(Pet.tick)
            let before = p.call
            p.advance(to: t, calendar: calendar)
            if p.call != nil && p.call != before && !p.asleep && p.call != .light { return (t, p.call!) }
        }
        return nil
    }
}
