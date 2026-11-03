import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: GameModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @AppStorage(Beeper.enabledKey) private var soundOn = true
    @AppStorage(Notifier.enabledKey) private var notificationsOn = true

    private var version: String {
        let info = Bundle.main.infoDictionary
        let v = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let b = info?["CFBundleVersion"] as? String ?? "1"
        return "\(v) (\(b))"
    }

    private var palette: LCDPalette { LCDStyle.palette(for: scheme) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Play") {
                    Toggle("Sound", isOn: $soundOn)
                        .accessibilityIdentifier("toggle-sound")
                    Toggle("Notifications", isOn: $notificationsOn)
                        .accessibilityIdentifier("toggle-notifications")
                }
                .listRowBackground(palette.ink.opacity(0.1))

                Section {
                    Toggle("Classic mode", isOn: Binding(
                        get: { !model.pet.gentle },
                        set: { model.setGentle(!$0) }))
                    .accessibilityIdentifier("toggle-classic")
                    Toggle("Vacation mode", isOn: Binding(
                        get: { model.pet.paused },
                        set: { model.setPaused($0) }))
                    .accessibilityIdentifier("toggle-vacation")
                } footer: {
                    Text("By default your dino never dies; neglect only costs care points. Classic mode brings back the 1997 rules, where a dino left hungry or sick for too long can die. Vacation mode freezes time while you are away.")
                }
                .listRowBackground(palette.ink.opacity(0.1))

                Section("About") {
                    NavigationLink("About Pocket Rexie") { AboutView(version: version) }
                        .accessibilityIdentifier("settings-about")
                }
                .listRowBackground(palette.ink.opacity(0.1))
            }
            .lcdFormStyle(palette)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .accessibilityIdentifier("settings-done")
                }
            }
            .onChange(of: notificationsOn) { _, on in
                if on { Notifier.requestAuthorizationIfNeeded() }
                Notifier.reschedule(model.pet)
            }
        }
        .tint(palette.ink)
        .environment(\.lcdPalette, palette)
    }
}

private struct AboutView: View {
    let version: String
    @Environment(\.colorScheme) private var scheme
    private var rowColor: Color { LCDStyle.palette(for: scheme).ink.opacity(0.1) }

    var body: some View {
        Form {
            Section {
                Text("Pocket Rexie is free. There are no ads, no in-app purchases and no tracking.")
            }
            .listRowBackground(rowColor)
            Section {
                Text("Pocket Rexie is an independent homage to the virtual pets of the 1990s. It is not affiliated with Bandai or any other toy maker.")
            }
            .listRowBackground(rowColor)
            Section {
                LabeledContent("Version", value: version)
            }
            .listRowBackground(rowColor)
        }
        .lcdFormStyle(LCDStyle.palette(for: scheme))
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private extension View {
    /// Tints a Form to the LCD palette: ground behind, ink text and controls, faint ink rows.
    func lcdFormStyle(_ palette: LCDPalette) -> some View {
        self
            .scrollContentBackground(.hidden)
            .background(palette.background.ignoresSafeArea())
            .foregroundStyle(palette.ink)
            .tint(palette.ink)
    }
}
