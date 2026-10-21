import SwiftUI

@main
struct PocketRexieWatchApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model = GameModel()

    init() {
        PetSync.activate()
    }

    var body: some Scene {
        WindowGroup {
            WatchContentView(model: model)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                PetSync.activate()
                model.refresh()
                model.welcomeBack()
            } else if phase == .background {
                model.noteLeaving()
            }
        }
    }
}
