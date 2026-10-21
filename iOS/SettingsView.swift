import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: GameModel
    @Environment(\.dismiss) private var dismiss
    @AppStorage(Beeper.enabledKey) private var soundOn = true
    @AppStorage(Notifier.enabledKey) private var notificationsOn = true

    private var version: String {
        let info = Bundle.main.infoDictionary
        let v = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let b = info?["CFBundleVersion"] as? String ?? "1"
        return "\(v) (\(b))"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Play") {
                    Toggle("Sound", isOn: $soundOn)
                    Toggle("Notifications", isOn: $notificationsOn)
                }

                Section {
                    Toggle("Classic mode", isOn: Binding(
                        get: { !model.pet.gentle },
                        set: { model.setGentle(!$0) }))
                    Toggle("Vacation mode", isOn: Binding(
                        get: { model.pet.paused },
                        set: { model.setPaused($0) }))
                } footer: {
                    Text("By default your dino never dies; neglect only costs care points. Classic mode brings back the 1997 rules, where a dino left hungry or sick for too long can die. Vacation mode freezes time while you are away.")
                }

                Section("About") {
                    NavigationLink("About Pocket Rexie") { AboutView(version: version) }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onChange(of: notificationsOn) { _, on in
                if on { Notifier.requestAuthorizationIfNeeded() }
                Notifier.reschedule(model.pet)
            }
        }
    }
}

private struct AboutView: View {
    let version: String

    var body: some View {
        Form {
            Section {
                Text("Pocket Rexie is free. There are no ads, no in-app purchases and no tracking.")
            }
            Section {
                Text("Pocket Rexie is an independent homage to the virtual pets of the 1990s. It is not affiliated with Bandai or any other toy maker.")
            }
            Section {
                LabeledContent("Version", value: version)
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}
