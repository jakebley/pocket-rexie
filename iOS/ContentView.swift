import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var model: GameModel
    /// Fixed time for the scene (tests); nil means the live clock.
    private let clock: Date?
    /// A model was handed in (tests): skip launch side effects such as notifications.
    private let injected: Bool
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.colorScheme) private var scheme
    @State private var showSettings = false
    @State private var nameDraft = "Rexie"

    init(model: GameModel? = nil, clock: Date? = nil) {
        _model = StateObject(wrappedValue: model ?? GameModel())
        self.clock = clock
        self.injected = model != nil
    }

    private var needsName: Bool { model.pet.stage == .baby && !model.pet.named }

    private var palette: LCDPalette { LCDStyle.palette(for: scheme) }

    var body: some View {
        GeometryReader { geo in
            let layout = Layout(size: geo.size)
            VStack(spacing: 0) {
                HStack {
                    Spacer(minLength: 0)
                    gearButton
                }
                .frame(height: Layout.topBar)
                .padding(.horizontal, 4)

                Spacer(minLength: 0)

                VStack(spacing: Layout.gap) {
                    iconRow(Array(MenuIcon.allCases.prefix(5)), width: layout.side, glyphPixel: layout.glyphPixel)
                    LCDScreen(model: model, framed: true)
                        .frame(width: layout.side, height: layout.side)
                    iconRow(Array(MenuIcon.allCases.suffix(5)), width: layout.side, glyphPixel: layout.glyphPixel)
                    messageLine(width: layout.side)
                }
                .frame(width: layout.side)

                Spacer(minLength: 0)

                controls(width: layout.side)
                    .padding(.top, Layout.gap)
                    .padding(.bottom, Layout.bottomPad)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .background(palette.background.ignoresSafeArea())
        .environment(\.lcdPalette, palette)
        .environment(\.sceneDate, clock)
        .tint(palette.ink)
        .sheet(isPresented: $showSettings) {
            SettingsView(model: model)
                .presentationDetents([.medium, .large])
        }
        .alert("Your dino hatched!", isPresented: Binding(get: { needsName }, set: { _ in })) {
            TextField("Name", text: $nameDraft)
            Button("Name it") { model.rename(nameDraft) }
            Button("Keep \(model.pet.name)") { model.rename(model.pet.name) }
        } message: {
            Text("What will you call it?")
        }
        .onAppear {
            guard !injected else { return }
            model.onSave = { Notifier.reschedule($0) }
            model.onSceneEvent = { event in
                // Hatching and evolving already buzz from the stage/species changes below.
                if event == .petted { Haptics.tap() }
            }
            model.welcomeBack()
            Notifier.reschedule(model.pet)
            if model.pet.stage != .egg { Notifier.requestAuthorizationIfNeeded() }
        }
        .onChange(of: needsName, initial: true) { _, needs in
            if needs { nameDraft = model.pet.name }
        }
        .onChange(of: model.pet.stage) { old, new in
            if old == .egg && new != .egg {
                Notifier.requestAuthorizationIfNeeded()
                Haptics.success()
            }
        }
        .onChange(of: model.pet.species) { old, new in
            if !old.isEmpty && !new.isEmpty {
                Beeper.shared.jingle()
                Haptics.success()
            }
        }
        .onChange(of: model.pet.call) { old, new in
            if old == nil && new != nil && model.pet.needsAttention {
                Beeper.shared.jingle()
                Haptics.success()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                model.reloadFromStore()
                model.refresh()
                model.welcomeBack()
            } else if phase == .background {
                model.noteLeaving()
            }
        }
    }

    // MARK: pieces

    private var gearButton: some View {
        Button {
            Haptics.tap()
            showSettings = true
        } label: {
            PixelGlyphView(rows: PixelBitmap.gear, pixel: 3)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Settings")
    }

    private func iconRow(_ icons: [MenuIcon], width: CGFloat, glyphPixel: CGFloat) -> some View {
        HStack(spacing: 0) {
            ForEach(icons) { icon in
                let isSelected = model.selected == icon
                Button {
                    Haptics.tap()
                    Beeper.shared.blip()
                    model.perform(icon)
                } label: {
                    PixelGlyphView(rows: icon.glyph, pixel: glyphPixel,
                                   color: isSelected ? palette.background : palette.ink)
                        .frame(maxWidth: .infinity, minHeight: Layout.rowHeight, maxHeight: Layout.rowHeight)
                        .background(
                            Rectangle()
                                .fill(isSelected ? palette.ink : Color.clear)
                                .padding(2)
                        )
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(icon.title)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .frame(width: width)
    }

    private func messageLine(width: CGFloat) -> some View {
        let text = model.message.isEmpty ? model.pet.statusLine : model.message
        return PixelParagraph(text: text, pixel: 3, maxChars: max(8, Int(width / 12)), centered: true)
            .frame(width: width, height: Layout.messageHeight)
            .contentShape(Rectangle())
            .onTapGesture { model.dismissMessage() }
    }

    private func controls(width: CGFloat) -> some View {
        HStack(spacing: 12) {
            ControlButton(label: "A") { model.cycleSelection() }
            ControlButton(label: "B") { model.confirm() }
            ControlButton(label: "C") { model.cancel() }
        }
        .frame(width: width)
    }
}

// MARK: - layout and controls

/// Sizes for the phone layout. The square is limited by both width and remaining height.
private struct Layout {
    static let gutter: CGFloat = 16
    static let maxSide: CGFloat = 440
    static let topBar: CGFloat = 44
    static let rowHeight: CGFloat = 48
    static let messageHeight: CGFloat = 34
    static let buttonHeight: CGFloat = 56
    static let gap: CGFloat = 8
    static let bottomPad: CGFloat = 8

    let side: CGFloat
    let glyphPixel: CGFloat

    init(size: CGSize) {
        // top bar, two icon rows, message, controls, five gaps, bottom padding and a little slack
        let fixed = Layout.topBar + Layout.rowHeight * 2 + Layout.messageHeight
            + Layout.buttonHeight + Layout.gap * 5 + Layout.bottomPad + 8
        side = max(160, min(size.width - Layout.gutter * 2, Layout.maxSide, size.height - fixed))
        glyphPixel = size.width >= 600 ? 4 : 3
    }
}

/// One flat A / B / C control: pixel label, ink outline, inverted while pressed.
private struct ControlButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button {
            Haptics.tap()
            Beeper.shared.blip()
            action()
        } label: {
            EmptyView()
        }
        .buttonStyle(ControlButtonStyle(title: label))
        .accessibilityLabel("Button \(label)")
    }
}

private struct ControlButtonStyle: ButtonStyle {
    let title: String

    func makeBody(configuration: Configuration) -> some View {
        ControlFace(title: title, pressed: configuration.isPressed)
    }
}

private struct ControlFace: View {
    let title: String
    let pressed: Bool
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        PixelText(title, pixel: 4, color: pressed ? palette.background : palette.ink)
            .frame(maxWidth: .infinity, minHeight: Layout.buttonHeight, maxHeight: Layout.buttonHeight)
            .background(pressed ? palette.ink : Color.clear)
            .overlay(Rectangle().strokeBorder(palette.ink, lineWidth: 2))
            .contentShape(Rectangle())
    }
}

@MainActor
enum Haptics {
    static func tap() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
