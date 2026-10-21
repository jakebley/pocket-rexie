import SwiftUI

@main
struct PocketRexieApp: App {
    init() {
        PetSync.activate()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
