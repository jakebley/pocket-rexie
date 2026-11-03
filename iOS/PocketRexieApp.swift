import SwiftUI

@main
struct PocketRexieApp: App {
    init() {
        UITestSupport.configureIfRequested()
        if !UITestSupport.active { PetSync.activate() }
    }

    var body: some Scene {
        WindowGroup {
            ContentView(clock: UITestSupport.sceneClock)
        }
    }
}
