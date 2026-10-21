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

    @Published var pet: Pet
    @Published var message = ""
    @Published var mode: Mode = .home
    @Published var selected: MenuIcon = .feed
    /// Highlighted row in the feed menu: 0 meat, 1 veggies, 2 pasta, 3 snack, 4 cancel.
    @Published var menuIndex = 0

    /// Called after every save (the iOS app uses it to reschedule notifications).
    var onSave: ((Pet) -> Void)?

    private var messageUntil = Date.distantPast
    private var cancellables = Set<AnyCancellable>()

    init() {
        pet = PetStore.load()

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
        p.advance(to: Date())
        if p != pet {
            if p.species != pet.species && !pet.species.isEmpty && p.isAlive {
                say("\(p.name) evolved into \(p.speciesName)!")
            }
            pet = p
            persist()
        }
    }

    /// Pick up changes made elsewhere (watch, widget buttons).
    func reloadFromStore() {
        let p = PetStore.load()
        if p != pet {
            pet = p
            onSave?(p)
        }
    }

    private func tick() {
        if !message.isEmpty && Date() > messageUntil { message = "" }
        refresh()
    }

    private func persist() {
        PetStore.save(pet)
        PetSync.push(pet)
        onSave?(pet)
    }

    private func say(_ text: String) {
        message = text
        messageUntil = Date().addingTimeInterval(4)
    }

    private func mutate(_ body: (inout Pet) -> String) {
        pet.advance(to: Date())
        say(body(&pet))
        persist()
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
            pet.advance(to: Date())
            if let why = blockedReason { say(why); return }
            menuIndex = 0
            mode = .feedMenu
        case .play:
            pet.advance(to: Date())
            if let why = blockedReason { say(why); return }
            mode = .play(PlayState())
        case .stats:
            pet.advance(to: Date())
            mode = .stats
        case .light:
            mode = .home
            mutate { $0.toggleLight() }
        case .medicine:
            mode = .home
            mutate { $0.giveMedicine() }
        case .clean:
            mode = .home
            mutate { $0.clean() }
        case .climate:
            mode = .home
            mutate { $0.climate() }
        case .train:
            mode = .home
            mutate { $0.train() }
        case .battle:
            mode = .home
            mutate { $0.battle() }
        case .scold:
            mode = .home
            mutate { $0.scold() }
        }
    }

    func chooseFood(_ food: Food) {
        mode = .home
        mutate { $0.feed(food) }
    }

    func chooseSnack() {
        mode = .home
        mutate { $0.feedSnack() }
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
            mutate { $0.finishPlay(wins: wins) }
        } else {
            s.round += 1
            s.shown = revealed
            s.revealed = nil
            mode = .play(s)
        }
    }

    // MARK: other

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
        mutate { $0.pet() }
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
        case .stats, .dex:
            cancel()
        }
    }

    func startNewEgg() {
        guard !pet.isAlive else { return }
        pet.newEgg(now: Date())
        mode = .home
        selected = .feed
        say("A new egg!")
        persist()
    }

    func rename(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        pet.advance(to: Date())
        if !trimmed.isEmpty { pet.name = String(trimmed.prefix(12)) }
        pet.named = true
        persist()
    }

    func openDex() { mode = .dex }
    func openStats() { mode = .stats }

    func setPaused(_ on: Bool) {
        pet.advance(to: Date())
        pet.paused = on
        persist()
    }

    func setGentle(_ on: Bool) {
        pet.advance(to: Date())
        pet.gentle = on
        persist()
    }
}
