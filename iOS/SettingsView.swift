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
    @AppStorage(EntitlementStore.previewKey, store: PetStore.defaults) private var plusPreview: Bool = TesterTools.isTestFlight()
    @AppStorage(EntitlementStore.chooserKey, store: PetStore.defaults) private var eggChooser = false
    @State private var confirmFamily: Family?
    private let testerTools = TesterTools.isEnabled()
    /// Render tests: ImageRenderer cannot draw ScrollView or NavigationStack, so the sheet is laid out flat.
    @Environment(\.chromeStaticRender) private var staticRender

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
        if colorMode == .technicolor { fineBody } else { classicBody }
    }

    // MARK: Technicolor: the pixel chrome sheet

    @ViewBuilder private var fineBody: some View {
        if staticRender {
            fineSheet
        } else {
            NavigationStack { fineSheet }
                .tint(palette.ink)
                .environment(\.lcdPalette, palette)
        }
    }

    private var fineSheet: some View {
            GeometryReader { geo in
                let inner = geo.size.width - 12 - 28   // sheet margin and panel padding
                ChromeScroll(staticRender: staticRender) {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            ChromeText("SETTINGS", ps: 6)
                            Spacer(minLength: 8)
                            ChromeButton(title: "CLOSE", ps: 2.6, minHeight: 44, identifier: "settings-done") { dismiss() }
                        }
                        ChromeSectionHeader(title: "LOOK")
                        HStack(spacing: 12) {
                            ForEach(ColorMode.allCases, id: \.self) { mode in
                                LookTile(mode: mode, selected: colorMode == mode,
                                         raster: SceneRenderer.still(pet: model.pet, look: mode),
                                         preview: LCDStyle.palette(for: scheme, mode: mode),
                                         chrome: palette) { choose(mode) }
                            }
                        }
                        ChromeParagraph(text: "Traditional is the green-gray monochrome LCD. Technicolor paints the room in muted, nostalgic colors. It applies to the widgets and the watch too.",
                                        ps: 2.6, avail: inner, color: palette.ink.opacity(0.75))
                        ChromeSectionHeader(title: "PLAY")
                        ChromeToggleRow(title: "SOUND", subtitle: "BEEPS AND TUNES", isOn: $soundOn, identifier: "toggle-sound", width: inner)
                        ChromeToggleRow(title: "NOTIFICATIONS", subtitle: "CALLS WHEN IT NEEDS YOU", isOn: $notificationsOn,
                                        identifier: "toggle-notifications", width: inner)
                        ChromeToggleRow(title: "CLASSIC", subtitle: "THE 1997 RULES, A NEGLECTED DINO CAN DIE",
                                        isOn: Binding(get: { !model.pet.gentle }, set: { model.setGentle(!$0) }),
                                        identifier: "toggle-classic", width: inner)
                        ChromeToggleRow(title: "VACATION", subtitle: "PAUSE THE PET WHILE YOU ARE AWAY",
                                        isOn: Binding(get: { model.pet.paused }, set: { model.setPaused($0) }),
                                        identifier: "toggle-vacation", width: inner)
                        if testerTools {
                            ChromeSectionHeader(title: "TESTING")
                            ChromeToggleRow(title: "PREVIEW PLUS", subtitle: "UNLOCK PLUS FAMILIES, NO PAYMENT", isOn: $plusPreview,
                                            identifier: "toggle-plus-preview", width: inner)
                            ChromeToggleRow(title: "SHOW EGG CHOOSER", isOn: $eggChooser, identifier: "toggle-egg-chooser", width: inner)
                            ChromeText("NEW EGG OF ANY FAMILY", ps: 3.5)
                            let cols = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]
                            LazyVGrid(columns: cols, spacing: 8) {
                                ForEach(Species.families, id: \.id) { fam in
                                    ChromeButton(title: fam.name, ps: 2, fill: true, hpad: 6, identifier: "tester-egg-" + fam.id) { confirmFamily = fam }
                                }
                            }
                            HStack {
                                ChromeText("VERSION", ps: 3.5)
                                Spacer()
                                ChromeText(version, ps: 3.5)
                            }
                            .accessibilityElement(children: .combine)
                            .accessibilityIdentifier("tester-version")
                            ChromeParagraph(text: "Only in test builds, never in the App Store version. New egg replaces your current pet and keeps your Dex.",
                                            ps: 2.6, avail: inner, color: palette.ink.opacity(0.75))
                        }
                        ChromeSectionHeader(title: "MORE")
                        NavigationLink {
                            AboutView(version: version)
                        } label: {
                            ChromeText("ABOUT POCKET REXIE", ps: 4)
                                .frame(maxWidth: .infinity, minHeight: 52)
                                .chromeBox(.raised)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("About Pocket Rexie")
                        .accessibilityIdentifier("settings-about")
                    }
                    .padding(14)
                }
                .chromeBox(.raised, radius: 5)
                .padding(6)
            }
            .background(palette.background.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .confirmationDialog("Replace your pet with a new \(confirmFamily?.name ?? "") egg?",
                                isPresented: Binding(get: { confirmFamily != nil }, set: { if !$0 { confirmFamily = nil } }),
                                titleVisibility: .visible) {
                Button("Replace pet", role: .destructive) {
                    if let fam = confirmFamily { model.testerNewEgg(family: fam.id) }
                    confirmFamily = nil
                }
                Button("Cancel", role: .cancel) { confirmFamily = nil }
            }
            .onChange(of: notificationsOn) { _, on in
                if on { Notifier.requestAuthorizationIfNeeded() }
                Notifier.reschedule(model.pet)
            }
    }

    private var classicBody: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 12) {
                        ForEach(ColorMode.allCases, id: \.self) { mode in
                            LookTile(mode: mode, selected: colorMode == mode,
                                     raster: SceneRenderer.still(pet: model.pet, look: mode),
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

                if testerTools {
                    Section {
                        Toggle("Preview Plus", isOn: $plusPreview)
                            .accessibilityIdentifier("toggle-plus-preview")
                        Toggle("Show egg chooser", isOn: $eggChooser)
                            .accessibilityIdentifier("toggle-egg-chooser")
                        Menu {
                            ForEach(Species.families, id: \.id) { fam in
                                Button(fam.name) { confirmFamily = fam }
                            }
                        } label: {
                            Text("New egg of any family")
                        }
                        .accessibilityIdentifier("tester-new-egg")
                        LabeledContent("Version", value: version)
                            .accessibilityIdentifier("tester-version")
                    } header: {
                        Text("Testing")
                    } footer: {
                        Text("Only in test builds (TestFlight and Debug), never in the App Store version. Preview Plus unlocks every animal family for new eggs without a purchase. New egg replaces your current pet with a fresh egg of the family you pick and keeps your Dex. Nothing is charged.")
                    }
                    .listRowBackground(palette.ink.opacity(0.1))
                }

                Section("About") {
                    NavigationLink("About Pocket Rexie") { AboutView(version: version) }
                        .accessibilityIdentifier("settings-about")
                }
                .listRowBackground(palette.ink.opacity(0.1))
            }
            .lcdFormStyle(palette)
            .confirmationDialog("Replace your pet with a new \(confirmFamily?.name ?? "") egg?",
                                isPresented: Binding(get: { confirmFamily != nil },
                                                     set: { if !$0 { confirmFamily = nil } }),
                                titleVisibility: .visible) {
                Button("Replace pet", role: .destructive) {
                    if let fam = confirmFamily { model.testerNewEgg(family: fam.id) }
                    confirmFamily = nil
                }
                Button("Cancel", role: .cancel) { confirmFamily = nil }
            }
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
        if chrome.mode == .technicolor { fineBody } else { classicBody }
    }

    @ViewBuilder private var fineBody: some View {
        let fg = selected ? chrome.background : chrome.ink
        return Button(action: action) {
            VStack(spacing: 8) {
                Canvas { ctx, size in
                    LCDPainter.paint(&ctx, raster: raster, size: size, palette: preview)
                }
                .aspectRatio(1, contentMode: .fit)
                .background(preview.background)
                .overlay(Rectangle().strokeBorder(preview.ink.opacity(0.5), lineWidth: 1))
                HStack(spacing: 4) {
                    if selected { ChromeIcon(name: "tick", pixel: 1, color: fg) }
                    ChromeText(mode.title, ps: 2.6, color: fg)
                }
                .frame(maxWidth: .infinity, minHeight: 28)
            }
            .padding(10)
            .chromeBox(selected ? .tileOn : .tile, radius: 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(mode.title)
        .accessibilityValue(selected ? "Selected" : "Not selected")
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
        .accessibilityIdentifier("look-" + mode.rawValue)
    }

    private var classicBody: some View {
        let fg = selected ? chrome.background : chrome.ink
        return Button(action: action) {
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

    @Environment(\.dismiss) private var dismiss
    @Environment(\.chromeStaticRender) private var staticRender

    var body: some View {
        if mode == .technicolor { fineBody } else { classicBody }
    }

    @ViewBuilder private var fineBody: some View {
        let palette = LCDStyle.palette(for: scheme, mode: mode)
        return GeometryReader { geo in
            let inner = geo.size.width - 12 - 28
            ChromeScroll(staticRender: staticRender) {
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        ChromeText("ABOUT", ps: 6)
                        Spacer(minLength: 8)
                        ChromeButton(title: "BACK", ps: 2.6, minHeight: 44, identifier: "about-back") { dismiss() }
                    }
                    ChromeParagraph(text: "Pocket Rexie is free. There are no ads, no in-app purchases and no tracking.", ps: 3, avail: inner)
                    ChromeParagraph(text: "Pocket Rexie is an independent homage to the virtual pets of the 1990s. It is not affiliated with Bandai or any other toy maker.", ps: 3, avail: inner)
                    ChromeText("VERSION " + version, ps: 3.5)
                }
                .padding(14)
            }
            .chromeBox(.raised, radius: 5)
            .padding(6)
        }
        .background(palette.background.ignoresSafeArea())
        .environment(\.lcdPalette, palette)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var classicBody: some View {
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
