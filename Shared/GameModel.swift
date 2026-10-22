import SwiftUI
import Combine

/// The eight menu icons, in the order of the original toy.
enum MenuIcon: CaseIterable, Identifiable {
    case feed, light, play, train, medicine, clean, climate, scold, battle, stats

    var id: Self { self }

    var symbol: String {
        switch self {
        case .feed: return "fork.knife"
        case .light: return "lightbulb"
        case .play: return "gamecontroller"
        case .medicine: return "cross.case"
        case .clean: return "sparkles"
        case .train: return "figure.strengthtraining.traditional"
        case .climate: return "thermometer.medium"
        case .battle: return "bolt.shield"
        case .scold: return "exclamationmark.bubble"
        case .stats: return "chart.bar"
        }
    }

    var title: String {
        switch self {
        case .feed: return "Feed"
        case .light: return "Light"
        case .play: return "Play"
        case .medicine: return "Medicine"
        case .clean: return "Clean"
        case .train: return "Train"
        case .climate: return "Climate"
        case .battle: return "Battle"
        case .scold: return "Scold"
        case .stats: return "Stats"
        }
    }
}

/// Drives the UI for the app and the watch. Every mutation advances the pet to now first,
/// then acts, then saves and syncs.
@MainActor
final class GameModel: ObservableObject {
    /// State of the 5-round higher/lower game.
    struct PlayState: Equatable {
        var round = 1
        var shown = Int.random(in: 1...9)
        var revealed: Int?
        var wins = 0
        var lastWin = false
        var pickHigher = true
    }

    enum Mode: Equatable {
        case home
        case feedMenu
        case play(PlayState)
        case stats
        case dex
    }

    static let rounds = 5

    /// UI tests: messages stay until dismissed, and nothing touches the last-seen bookkeeping.
    nonisolated(unsafe) static var deterministic = false

    @Published var pet: Pet {
        didSet { noteSpeciesChange(from: oldValue, to: pet) }
    }
    @Published var message = ""
    @Published var mode: Mode = .home
    @Published var selected: MenuIcon = .feed
    /// Highlighted row in the feed menu: 0 meat, 1 veggies, 2 pasta, 3 snack, 4 cancel.
    @Published var menuIndex = 0
    /// Which stats page is showing: 0 is the status page, 1 the detail list.
    @Published var statsPage = 0
    /// Set for 3 seconds after the species changes (ids of the old and new species).
    @Published var evolutionFlash: (from: String, to: String)?
    /// When this model saw the egg hatch; the screen flashes a crack frame for 20 seconds.
    @Published var hatchedAt: Date?
    /// Transient happenings for the living scene (fed, cleaned, petted...). The screen drains this
    /// queue and animates each one; keep rules out of it, it is only for show.
    @Published var sceneEvents: [SceneEvent] = []
    /// "WHILE YOU WERE AWAY: ..." (or "<NAME> MISSED YOU"), set on foreground after 15+ minutes
    /// and shown in the message line for 8 seconds.
    @Published private(set) var awayLine: String?

    /// Called after every save (the iOS app uses it to reschedule notifications).
    var onSave: ((Pet) -> Void)?
    /// Called for every scene event as it is queued (the iOS app uses it for haptics).
    var onSceneEvent: (@MainActor (SceneEvent) -> Void)?

    /// When this device last had the app in front, kept locally (not in the synced pet).
    static let lastSeenKey = "rexie.lastSeen"
    private var lastSeenWritten = Date.distantPast

    /// Where saves go. nil means the real PetStore plus watch sync; tests and previews inject their own.
    private let persistHandler: ((Pet) -> Void)?
    /// True when built with an injected pet: no timers, no store reloads, so the state stays put.
    private let isolated: Bool

    private var messageUntil = Date.distantPast
    private var flashUntil = Date.distantPast
    private var cancellables = Set<AnyCancellable>()

    /// `pet` and `persist` are for tests and previews: with them the model neither ticks nor touches
    /// the shared store. The defaults keep the normal app behaviour.
    init(pet injected: Pet? = nil, persist: ((Pet) -> Void)? = nil) {
        pet = injected ?? PetStore.load()
        persistHandler = persist
        isolated = injected != nil
        if isolated { return }

        Timer.publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                MainActor.assumeIsolated {
                    if let self { self.tick() }
                }
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: .petSynced)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                MainActor.assumeIsolated {
                    if let self { self.reloadFromStore() }
                }
            }
            .store(in: &cancellables)
    }

    // MARK: refresh and persistence

    /// Advance to now and save if anything changed.
    func refresh() {
        guard pet.isAlive else { return }
        var p = pet
        p.advance(to: AppClock.now())
        if p != pet {
            if p.species != pet.species && !pet.species.isEmpty && p.isAlive {
                say("\(p.name) evolved into \(p.speciesName)!")
            }
            pet = p
            // While on vacation the clock only slides forward; no need to write it every second.
            if !p.paused { persist() }
        }
    }

    /// Pick up changes made elsewhere (watch, widget buttons).
    func reloadFromStore() {
        guard !isolated else { return }
        let p = PetStore.load()
        if p != pet {
            pet = p
            onSave?(p)
        }
    }

    private func tick() {
        let now = Date()
        if !message.isEmpty && now > messageUntil {
            message = ""
            awayLine = nil
        }
        if !GameModel.deterministic && now.timeIntervalSince(lastSeenWritten) >= 60 { markSeen(now) }
        if evolutionFlash != nil && Date() > flashUntil { evolutionFlash = nil }
        refresh()
    }

    private func persist() {
        pet.modified = Date()
        if let persistHandler {
            persistHandler(pet)
        } else {
            PetStore.save(pet)
            PetSync.push(pet)
        }
        onSave?(pet)
    }

    /// Runs on every change of `pet`, wherever it came from (tick, button, sync).
    private func noteSpeciesChange(from old: Pet, to new: Pet) {
        guard new.isAlive, old.species != new.species, !new.species.isEmpty else { return }
        if old.species.isEmpty {
            if new.stage == .baby {
                hatchedAt = Date()
                emit(.hatched)
            }
        } else {
            evolutionFlash = (from: old.species, to: new.species)
            flashUntil = Date().addingTimeInterval(3)
            emit(.evolved)
        }
    }

    private func say(_ text: String, seconds: TimeInterval = 4) {
        message = text
        messageUntil = GameModel.deterministic ? .distantFuture : Date().addingTimeInterval(seconds)
    }

    private func emit(_ event: SceneEvent) {
        sceneEvents.append(event)
        if sceneEvents.count > 8 { sceneEvents.removeFirst(sceneEvents.count - 8) }
        onSceneEvent?(event)
    }

    private func canAct(_ p: Pet) -> Bool { !p.asleep && p.stage != .egg && p.stage != .ghost }

    /// Runs one engine action. `event` looks at the pet before and after and returns the scene
    /// event to play when the action actually did something.
    private func mutate(event: (Pet, Pet) -> SceneEvent?, _ body: (inout Pet) -> String) {
        pet.advance(to: AppClock.now())
        let before = pet
        say(body(&pet))
        persist()
        if let e = event(before, pet) { emit(e) }
    }

    private func mutate(_ body: (inout Pet) -> String) {
        pet.advance(to: AppClock.now())
        say(body(&pet))
        persist()
    }

    // MARK: away from the screen

    private func markSeen(_ now: Date) {
        guard !GameModel.deterministic else { return }
        lastSeenWritten = now
        UserDefaults.standard.set(now, forKey: GameModel.lastSeenKey)
    }

    /// Call when the app goes to the background.
    func noteLeaving() { markSeen(Date()) }

    /// Call on foreground after `refresh()`: summarises a long absence and sends the pet running in.
    func welcomeBack(now: Date = Date()) {
        guard !GameModel.deterministic else { return }
        let last = UserDefaults.standard.object(forKey: GameModel.lastSeenKey) as? Date
        markSeen(now)
        guard let last, pet.isAlive, pet.stage != .egg, !pet.paused,
              now.timeIntervalSince(last) >= 15 * 60 else { return }
        let line = AwaySummary.line(for: pet, since: last, now: now)
        awayLine = line
        say(line, seconds: 8)
        if !pet.asleep { emit(.returned) }
    }

    /// Tap-dismiss for the message line.
    func dismissMessage() {
        message = ""
        awayLine = nil
    }

    /// Why the pet cannot be fed or played with right now, if anything.
    private var blockedReason: String? {
        if !pet.isAlive { return "\(pet.name) has passed on" }
        if pet.stage == .egg { return "Still an egg" }
        if pet.asleep { return "Shh, \(pet.name) is asleep" }
        return nil
    }

    // MARK: menu actions

    func perform(_ icon: MenuIcon) {
        selected = icon
        switch icon {
        case .feed:
            pet.advance(to: AppClock.now())
            if let why = blockedReason { say(why); return }
            menuIndex = 0
            mode = .feedMenu
        case .play:
            pet.advance(to: AppClock.now())
            if let why = blockedReason { say(why); return }
            mode = .play(PlayState())
        case .stats:
            pet.advance(to: AppClock.now())
            statsPage = 0
            mode = .stats
        case .light:
            mode = .home
            mutate(event: { b, a in a.lightOn != b.lightOn ? SceneEvent.light : nil }) { $0.toggleLight() }
        case .medicine:
            mode = .home
            mutate(event: { b, a in
                (a.medDoses != b.medDoses || (b.sick && !a.sick)) ? SceneEvent.medicine : nil
            }) { $0.giveMedicine() }
        case .clean:
            mode = .home
            mutate(event: { b, a in
                (b.poops > 0 && a.poops == 0) ? SceneEvent.cleaned : nil
            }) { $0.clean() }
        case .climate:
            mode = .home
            mutate(event: { b, a in
                (b.temp != 0 && a.temp == 0) ? SceneEvent.climate : nil
            }) { $0.climate() }
        case .train:
            mode = .home
            mutate(event: { b, a in a.trains > b.trains ? SceneEvent.trained : nil }) { $0.train() }
        case .battle:
            mode = .home
            mutate(event: { b, a in
                a.battles > b.battles ? SceneEvent.battle(win: a.wins > b.wins) : nil
            }) { $0.battle() }
        case .scold:
            mode = .home
            mutate { $0.scold() }
        }
    }

    func chooseFood(_ food: Food) {
        mode = .home
        mutate(event: { b, a in a.hunger > b.hunger ? SceneEvent.fed(food) : nil }) { $0.feed(food) }
    }

    func chooseSnack() {
        mode = .home
        mutate(event: { b, a in a.happy > b.happy ? SceneEvent.snack : nil }) { $0.feedSnack() }
    }

    // MARK: mini-game

    func guess(higher: Bool) {
        guard case .play(var s) = mode, s.revealed == nil else { return }
        var next = Int.random(in: 1...9)
        while next == s.shown { next = Int.random(in: 1...9) }
        let win = (next > s.shown) == higher
        s.revealed = next
        s.lastWin = win
        if win { s.wins += 1 }
        mode = .play(s)
    }

    /// After a guess is revealed: next round, or finish and apply the result to the pet.
    func continuePlay() {
        guard case .play(var s) = mode, let revealed = s.revealed else { return }
        if s.round >= GameModel.rounds {
            let wins = s.wins
            mode = .home
            mutate(event: { [self] b, _ in
                canAct(b) ? SceneEvent.played(wins: wins) : nil
            }) { $0.finishPlay(wins: wins) }
        } else {
            s.round += 1
            s.shown = revealed
            s.revealed = nil
            mode = .play(s)
        }
    }

    // MARK: other

    /// Accessibility value of the LCD in UI tests, e.g. "hunger 1 happy 3 poops 0 stage child ... name Rexie" (name last, it may hold spaces).
    var uiTestSummary: String {
        let modeName: String
        switch mode {
        case .home: modeName = "home"
        case .feedMenu: modeName = "feed"
        case .play: modeName = "play"
        case .stats: modeName = statsPage == 0 ? "stats" : "details"
        case .dex: modeName = "dex"
        }
        let p = pet
        return "hunger \(p.hunger) happy \(p.happy) poops \(p.poops) stage \(p.stage.rawValue) mode \(modeName) "
            + "named \(p.named ? 1 : 0) classic \(p.gentle ? 0 : 1) vacation \(p.paused ? 1 : 0) "
            + "asleep \(p.asleep ? 1 : 0) sick \(p.sick ? 1 : 0) light \(p.lightOn ? 1 : 0) "
            + "dex \(p.dex.count) gen \(p.generation) name \(p.name)"
    }

    func cancel() {
        switch mode {
        case .home:
            message = ""
        case .play:
            say("Maybe later")
            mode = .home
        case .feedMenu, .stats, .dex:
            mode = .home
        }
    }

    func tapPet() {
        guard mode == .home, pet.isAlive else { return }
        mutate(event: { [self] b, _ in canAct(b) ? SceneEvent.petted : nil }) { $0.pet() }
    }

    /// Button A.
    func cycleSelection() {
        switch mode {
        case .home:
            let all = MenuIcon.allCases
            let i = all.firstIndex(of: selected) ?? 0
            selected = all[(i + 1) % all.count]
        case .feedMenu:
            menuIndex = (menuIndex + 1) % 5
        case .play(var s):
            if s.revealed == nil {
                s.pickHigher.toggle()
                mode = .play(s)
            }
        case .stats, .dex:
            break
        }
    }

    /// Button B.
    func confirm() {
        switch mode {
        case .home:
            perform(selected)
        case .feedMenu:
            switch menuIndex {
            case 0: chooseFood(.meat)
            case 1: chooseFood(.veggie)
            case 2: chooseFood(.pasta)
            case 3: chooseSnack()
            default: cancel()
            }
        case .play(let s):
            if s.revealed == nil { guess(higher: s.pickHigher) } else { continuePlay() }
        case .stats:
            // B pages through the status screens: status, details, dex, then back home.
            if statsPage == 0 { statsPage = 1 } else { openDex() }
        case .dex:
            cancel()
        }
    }

    func startNewEgg() {
        guard !pet.isAlive else { return }
        pet.newEgg(now: AppClock.now())
        mode = .home
        selected = .feed
        say("A new egg!")
        persist()
    }

    func rename(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        pet.advance(to: AppClock.now())
        if !trimmed.isEmpty { pet.name = String(trimmed.prefix(12)) }
        pet.named = true
        persist()
    }

    func openDex() { mode = .dex }
    func openStats() { mode = .stats }
    func setStatsPage(_ page: Int) { statsPage = page; mode = .stats }

    func setPaused(_ on: Bool) {
        pet.advance(to: AppClock.now())
        pet.paused = on
        persist()
    }

    func setGentle(_ on: Bool) {
        pet.advance(to: AppClock.now())
        pet.gentle = on
        persist()
    }
}
