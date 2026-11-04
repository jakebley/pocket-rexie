import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: GameModel
    /// Forces the look shown (render tests); nil follows the saved setting.
    var colorModeOverride: ColorMode?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @AppStorage(Beeper.enabledKey) private var soundOn = true
    @AppStorage(Notifier.enabledKey) private var notificationsOn = true
    @AppStorage(ColorModeStore.key, store: PetStore.defaults) private var storedMode: ColorMode = .traditional

    init(model: GameModel, colorModeOverride: ColorMode? = nil) {
        _model = ObservedObject(wrappedValue: model)
        self.colorModeOverride = colorModeOverride
    }

    private var colorMode: ColorMode { colorModeOverride ?? storedMode }

    private var version: String {
        let info = Bundle.main.infoDictionary
        let v = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let b = info?["CFBundleVersion"] as? String ?? "1"
        return "\(v) (\(b))"
    }

    private var palette: LCDPalette { LCDStyle.palette(for: scheme, mode: colorMode) }

    /// Applies a look at once: saved, widgets redrawn, watch told.
    private func choose(_ mode: ColorMode) {
        guard mode != colorMode else { return }
        storedMode = mode
        ColorModeStore.save(mode)
        PetSync.pushColorMode()
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    let raster = SceneRenderer.still(pet: model.pet)
                    HStack(spacing: 12) {
                        ForEach(ColorMode.allCases, id: \.self) { mode in
                            LookTile(mode: mode, selected: colorMode == mode, raster: raster,
                                     preview: LCDStyle.palette(for: scheme, mode: mode),
                                     chrome: palette) { choose(mode) }
                        }
                    }
                    .listRowInsets(EdgeInsets(top: 10, leading: 12, bottom: 10, trailing: 12))
                } header: {
                    Text("Look")
                } footer: {
                    Text("Traditional is the green-gray monochrome LCD. Technicolor paints the room in muted, nostalgic colors. It applies to the widgets and the watch too.")
                }
                .listRowBackground(palette.ink.opacity(0.1))

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

/// A large tappable tile for one look: a live still of the room in that look, its name, and a
/// checkmark with an inverted frame when selected.
private struct LookTile: View {
    let mode: ColorMode
    let selected: Bool
    let raster: SceneRaster
    /// The palette the preview is painted in.
    let preview: LCDPalette
    /// The settings sheet's own palette (frame and label).
    let chrome: LCDPalette
    let action: () -> Void

    var body: some View {
        let fg = selected ? chrome.background : chrome.ink
        Button(action: action) {
            VStack(spacing: 8) {
                Canvas { ctx, size in
                    LCDPainter.paint(&ctx, raster: raster, size: size, palette: preview)
                }
                .aspectRatio(1, contentMode: .fit)
                .background(preview.background)
                .overlay(Rectangle().strokeBorder(preview.ink.opacity(0.5), lineWidth: 1))
                HStack(spacing: 6) {
                    if selected {
                        PixelGlyphView(rows: PixelBitmap.check, pixel: 2, color: fg)
                    }
                    PixelText(mode.title, pixel: 2, color: fg)
                }
                .frame(maxWidth: .infinity, minHeight: 28)
                .background(selected ? chrome.ink : Color.clear)
            }
            .padding(6)
            .overlay(Rectangle().strokeBorder(chrome.ink, lineWidth: selected ? 3 : 1.5))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(mode.title)
        .accessibilityValue(selected ? "Selected" : "Not selected")
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
        .accessibilityIdentifier("look-" + mode.rawValue)
    }
}

private struct AboutView: View {
    let version: String
    @Environment(\.colorScheme) private var scheme
    @AppStorage(ColorModeStore.key, store: PetStore.defaults) private var mode: ColorMode = .traditional
    private var rowColor: Color { LCDStyle.palette(for: scheme, mode: mode).ink.opacity(0.1) }

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
        .lcdFormStyle(LCDStyle.palette(for: scheme, mode: mode))
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
