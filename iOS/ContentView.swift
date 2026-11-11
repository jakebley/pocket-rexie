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
    /// The look chosen in Settings (App Group defaults, shared with the widgets and watch).
    @AppStorage(ColorModeStore.key, store: PetStore.defaults) private var storedMode: ColorMode = .traditional
    /// Forces a look regardless of the setting (render tests).
    private let modeOverride: ColorMode?

    init(model: GameModel? = nil, clock: Date? = nil, colorMode: ColorMode? = nil) {
        _model = StateObject(wrappedValue: model ?? GameModel())
        self.clock = clock
        self.modeOverride = colorMode
        self.injected = model != nil || UITestSupport.active
    }

    private var needsName: Bool { model.pet.stage == .baby && !model.pet.named }

    private var palette: LCDPalette { LCDStyle.palette(for: scheme, mode: modeOverride ?? storedMode) }

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
                    iconRow(Array(MenuIcon.allCases.prefix(5)), layout: layout)
                    LCDScreen(model: model, framed: true)
                        .frame(width: layout.side, height: layout.side)
                    iconRow(Array(MenuIcon.allCases.suffix(5)), layout: layout)
                    messageLine(layout: layout)
                }
                .frame(width: layout.side)

                Spacer(minLength: 0)

                controls(layout: layout)
                    .padding(.top, Layout.gap)
                    .padding(.bottom, Layout.bottomPad)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .background(palette.background.ignoresSafeArea())
        // The naming alert raises the keyboard; the layout must not squeeze to fit above it.
        .ignoresSafeArea(.keyboard)
        .environment(\.lcdPalette, palette)
        .environment(\.sceneDate, clock)
        .tint(palette.ink)
        .sheet(isPresented: $showSettings) {
            SettingsView(model: model, colorModeOverride: modeOverride)
                .presentationDetents([.medium, .large])
        }
        .alert(model.pet.family == "dino" ? "Your dino hatched!" : "Your pet hatched!", isPresented: Binding(get: { needsName }, set: { _ in })) {
            TextField("Name", text: $nameDraft)
            Button("Name it") { model.rename(nameDraft) }
            Button("Keep \(model.pet.name)") { model.rename(model.pet.name) }
        } message: {
            Text("What will you call it?")
        }
        .onAppear {
            guard !injected else { return }
            model.onSave = { Notifier.reschedule($0) }
            model.onRecord = { Beeper.shared.jingle(); Haptics.success() }
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
                .frame(width: 48, height: 48)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Settings")
        .accessibilityIdentifier("settings-gear")
    }

    private func iconRow(_ icons: [MenuIcon], layout: Layout) -> some View {
        HStack(spacing: 0) {
            ForEach(icons) { icon in
                IconTile(icon: icon, selected: model.selected == icon, layout: layout,
                         palette: palette, model: model)
            }
        }
        .frame(width: layout.side)
    }

    private func messageLine(layout: Layout) -> some View {
        let width = layout.side
        let text = model.message.isEmpty ? model.pet.statusLine : model.message
        return PixelParagraph(text: text, pixel: 3, maxChars: max(8, Int(width / 12)), centered: true)
            .frame(width: width, height: layout.messageHeight, alignment: .center)
            .contentShape(Rectangle())
            .onTapGesture { model.dismissMessage() }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(text)
            .accessibilityIdentifier("message-line")
            .accessibilityAddTraits(.isButton)
    }

    private func controls(layout: Layout) -> some View {
        HStack(spacing: Layout.controlGap) {
            ControlButton(label: "A", height: layout.buttonHeight) { model.cycleSelection() }
            ControlButton(label: "B", height: layout.buttonHeight) { model.confirm() }
            ControlButton(label: "C", height: layout.buttonHeight) { model.cancel() }
        }
        .frame(width: layout.side)
    }
}

// MARK: - layout and controls

/// Sizes for the phone layout. The LCD square takes the full width minus a gutter (up to a cap on
/// iPad), limited by the height left after the fixed minimums; any height left over grows the
/// icon tiles, the message line and the A/B/C controls.
private struct Layout {
    static let gutter: CGFloat = 12
    static let padMaxSide: CGFloat = 640
    static let topBar: CGFloat = 48
    static let gap: CGFloat = 6
    static let controlGap: CGFloat = 10
    static let bottomPad: CGFloat = 8
    static let baseRow: CGFloat = 48
    /// Longest icon label (MEDICINE) in font pixels.
    static let labelFontWidth: CGFloat = 31
    static let baseMessage: CGFloat = 40
    static let baseButton: CGFloat = 64
    static let maxGrow: CGFloat = 120

    let side: CGFloat
    let rowHeight: CGFloat
    let messageHeight: CGFloat
    let buttonHeight: CGFloat
    let glyphPixel: CGFloat
    /// Pixel size of the icon labels, a half-pixel step so MEDICINE fits the tile.
    let labelPixel: CGFloat
    /// Height taken by a label and its gap.
    let labelBlock: CGFloat

    /// Label pixel size in half steps so the longest label (MEDICINE) fits a tile of this width.
    static func fitLabel(tileWidth: CGFloat) -> CGFloat {
        let fit: CGFloat = ((tileWidth - 8) / Layout.labelFontWidth * 2).rounded(.down) / 2
        return min(3, max(1, fit))
    }

    init(size: CGSize) {
        // top bar, two icon rows, message, controls, five gaps, bottom padding and a little slack
        var widthSide = size.width - Layout.gutter * 2
        if size.width >= 600 { widthSide = min(widthSide, Layout.padMaxSide) }
        // Five tiles share the width; leave 8pt of slack inside each for the highlight.
        let lp0: CGFloat = Layout.fitLabel(tileWidth: widthSide / 5)
        let fixed = Layout.topBar + (Layout.baseRow + (5 * lp0 + 4).rounded(.up)) * 2 + Layout.baseMessage
            + Layout.baseButton + Layout.gap * 5 + Layout.bottomPad + 4
        side = max(160, min(widthSide, size.height - fixed)).rounded(.down)
        let lp: CGFloat = Layout.fitLabel(tileWidth: side / 5)
        let lb: CGFloat = (5 * lp + 4).rounded(.up)
        labelPixel = lp
        labelBlock = lb
        let grow = min(max(0, size.height - fixed - side), Layout.maxGrow)
        rowHeight = (Layout.baseRow + lb + grow * 0.15).rounded()
        messageHeight = (Layout.baseMessage + grow * 0.2).rounded()
        buttonHeight = (Layout.baseButton + grow * 0.35).rounded()
        glyphPixel = rowHeight >= 62 && side >= 340 ? 4 : 3
    }
}

/// One menu icon: glyph with its name under it. Tap does the action; holding for 0.3 s only says what it does.
private struct IconTile: View {
    let icon: MenuIcon
    let selected: Bool
    let layout: Layout
    let palette: LCDPalette
    @ObservedObject var model: GameModel
    /// Set when a hold already described the icon, so the release does not also act.
    @State private var described = false

    var body: some View {
        let ink: Color = selected ? palette.background : palette.ink
        Button {
            if described { described = false; return }
            Haptics.tap()
            Beeper.shared.blip()
            model.perform(icon)
        } label: {
            VStack(spacing: 3) {
                PixelGlyphView(rows: icon.glyph, pixel: layout.glyphPixel, color: ink)
                PixelText(icon.label, pixel: layout.labelPixel, color: ink)
                    .accessibilityHidden(true)
            }
            .frame(maxWidth: .infinity, minHeight: layout.rowHeight, maxHeight: layout.rowHeight)
            .background(
                Rectangle()
                    .fill(selected ? palette.ink : Color.clear)
                    .padding(2)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.3).onEnded { _ in
                described = true
                Haptics.tap()
                Beeper.shared.blip()
                model.describe(icon)
            }
        )
        .accessibilityLabel(icon.title)
        .accessibilityHint("Hold to see what it does")
        .accessibilityIdentifier("menu-" + icon.title.lowercased())
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// One flat A / B / C control: pixel label, ink outline, inverted while pressed. It acts on touch
/// down (a quick tap never waits for the finger to lift) and stays a button for VoiceOver.
private struct ControlButton: View {
    let label: String
    let height: CGFloat
    let action: () -> Void
    @GestureState private var down = false
    @State private var fired = false
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        PixelText(label, pixel: 5, color: down ? palette.background : palette.ink)
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height)
            .background(down ? palette.ink : Color.clear)
            .overlay(Rectangle().strokeBorder(palette.ink, lineWidth: 2))
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .updating($down) { _, state, _ in state = true }
                    .onChanged { _ in
                        guard !fired else { return }
                        fired = true
                        fire()
                    }
                    .onEnded { _ in fired = false }
            )
            .onChange(of: down) { _, isDown in
                if !isDown { fired = false }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Button \(label)")
            .accessibilityIdentifier("btn-\(label)")
            .accessibilityAddTraits(.isButton)
            .accessibilityAction { fire() }
    }

    private func fire() {
        Haptics.tap()
        Beeper.shared.blip()
        action()
    }
}

@MainActor
enum Haptics {
    /// UI tests: no haptics.
    nonisolated(unsafe) static var muted = false

    static func tap() {
        guard !muted else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func success() {
        guard !muted else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
