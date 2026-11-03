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
        self.injected = model != nil || UITestSupport.active
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
                let isSelected = model.selected == icon
                Button {
                    Haptics.tap()
                    Beeper.shared.blip()
                    model.perform(icon)
                } label: {
                    PixelGlyphView(rows: icon.glyph, pixel: layout.glyphPixel,
                                   color: isSelected ? palette.background : palette.ink)
                        .frame(maxWidth: .infinity, minHeight: layout.rowHeight, maxHeight: layout.rowHeight)
                        .background(
                            Rectangle()
                                .fill(isSelected ? palette.ink : Color.clear)
                                .padding(2)
                        )
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(icon.title)
                .accessibilityIdentifier("menu-" + icon.title.lowercased())
                .accessibilityAddTraits(isSelected ? .isSelected : [])
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
    static let baseMessage: CGFloat = 40
    static let baseButton: CGFloat = 64
    static let maxGrow: CGFloat = 120

    let side: CGFloat
    let rowHeight: CGFloat
    let messageHeight: CGFloat
    let buttonHeight: CGFloat
    let glyphPixel: CGFloat

    init(size: CGSize) {
        // top bar, two icon rows, message, controls, five gaps, bottom padding and a little slack
        let fixed = Layout.topBar + Layout.baseRow * 2 + Layout.baseMessage
            + Layout.baseButton + Layout.gap * 5 + Layout.bottomPad + 4
        var widthSide = size.width - Layout.gutter * 2
        if size.width >= 600 { widthSide = min(widthSide, Layout.padMaxSide) }
        side = max(160, min(widthSide, size.height - fixed)).rounded(.down)
        let grow = min(max(0, size.height - fixed - side), Layout.maxGrow)
        rowHeight = (Layout.baseRow + grow * 0.15).rounded()
        messageHeight = (Layout.baseMessage + grow * 0.2).rounded()
        buttonHeight = (Layout.baseButton + grow * 0.35).rounded()
        glyphPixel = rowHeight >= 56 && side >= 340 ? 4 : 3
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
