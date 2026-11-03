import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

/// The game's notion of "now". Always the live clock, except in UI tests (see UITestSupport),
/// which pin it so the pet never drifts while a test runs.
enum AppClock {
    nonisolated(unsafe) static var now: () -> Date = { Date() }
}

/// Persistence shared by app, widget and watch via an App Group.
enum PetStore {
    static let groupID = "group.com.pocketrexie.shared"
    private static let key = "pet.v1"
    /// UI tests point this at a throwaway suite so they never touch the real group container.
    nonisolated(unsafe) static var overrideDefaults: UserDefaults?
    private static var defaults: UserDefaults { overrideDefaults ?? UserDefaults(suiteName: groupID) ?? .standard }

    static func load(now: Date = AppClock.now()) -> Pet {
        guard let data = defaults.data(forKey: key) else { return Pet(now: now) }
        guard var pet = try? JSONDecoder().decode(Pet.self, from: data) else {
            // Unreadable save: keep the bytes for recovery instead of overwriting them silently.
            defaults.set(data, forKey: key + ".unreadable")
            return Pet(now: now)
        }
        pet.advance(to: now)
        return pet
    }

    static func save(_ pet: Pet, reloadWidgets: Bool = true) {
        if let data = try? JSONEncoder().encode(pet) { defaults.set(data, forKey: key) }
        #if canImport(WidgetKit)
        if reloadWidgets { WidgetCenter.shared.reloadAllTimelines() }
        #endif
    }

    static func exists() -> Bool { defaults.data(forKey: key) != nil }
}
