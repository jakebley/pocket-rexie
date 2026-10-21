import AppIntents
import Foundation

// Interactive widget / Siri intents. Compiled into the iOS app, the watch app and both widget
// extensions. Each loads the pet (which replays elapsed ticks), acts, and saves; PetStore.save
// reloads widget timelines.

struct FeedMealIntent: AppIntent {
    static let title: LocalizedStringResource = "Feed a Meal"
    static let description = IntentDescription("Give Rexie a meal.")
    static let openAppWhenRun = false

    init() {}

    func perform() async throws -> some IntentResult {
        var pet = PetStore.load()
        _ = pet.feedMeal()
        PetStore.save(pet)
        return .result()
    }
}

struct CleanIntent: AppIntent {
    static let title: LocalizedStringResource = "Clean Up"
    static let description = IntentDescription("Clean up after Rexie.")
    static let openAppWhenRun = false

    init() {}

    func perform() async throws -> some IntentResult {
        var pet = PetStore.load()
        _ = pet.clean()
        PetStore.save(pet)
        return .result()
    }
}

struct ToggleLightIntent: AppIntent {
    static let title: LocalizedStringResource = "Toggle Light"
    static let description = IntentDescription("Turn Rexie's light on or off.")
    static let openAppWhenRun = false

    init() {}

    func perform() async throws -> some IntentResult {
        var pet = PetStore.load()
        _ = pet.toggleLight()
        PetStore.save(pet)
        return .result()
    }
}

struct MedicineIntent: AppIntent {
    static let title: LocalizedStringResource = "Give Medicine"
    static let description = IntentDescription("Give Rexie a dose of medicine.")
    static let openAppWhenRun = false

    init() {}

    func perform() async throws -> some IntentResult {
        var pet = PetStore.load()
        _ = pet.giveMedicine()
        PetStore.save(pet)
        return .result()
    }
}
