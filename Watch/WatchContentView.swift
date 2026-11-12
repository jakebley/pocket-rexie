import SwiftUI
#if os(watchOS)
import WatchKit
#endif

/// The watch app: the pixel scene fills the whole screen.
///
///  - Digital Crown: flips through the actions (and through the rows of a menu).
///  - Tap: does the selected action, like the phone's B button; in a mini-game, the tap is the game input (WatchInput).
///  - Long press: back (home: says what the selected action does; in a game: quits to the Play menu).
///  - A translucent panel over the scene names the selected action; messages and the status caption fade in and out.
struct WatchContentView: View {
    @ObservedObject var model: GameModel
    /// Explicit LCD palette (tests). Otherwise the dark palette in the synced look.
    let palette: LCDPalette?
    /// False in renders: the caption stays visible instead of fading after a few seconds.
    let fades: Bool
    @State private var crown: Double = 0
    @State private var lastDetent = 0
    /// A long press just fired, so the release must not also count as a tap.
    @State private var held = false
    @State private var caption: String
    @State private var captionVisible = true
    @State private var captionToken = 0
    @Environment(\.displayScale) private var displayScale
    @Environment(\.isLuminanceReduced) private var dimmed
    /// The look, synced from the phone (see PetSync); Traditional until the phone says otherwise.
    @AppStorage(ColorModeStore.key, store: PetStore.defaults) private var mode: ColorMode = .traditional

    init(model: GameModel, palette: LCDPalette? = nil, fades: Bool = true) {
        self.model = model
        self.palette = palette
        self.fades = fades
        _caption = State(initialValue: Self.captionText(model))
    }

    private let icons = MenuIcon.allCases

    /// The watch UI is always dark, so it uses the phone's dark palette in the synced look
    /// (Traditional or Technicolor), in Always-On too.
    private var colors: LCDPalette { palette ?? LCDStyle.palette(for: .dark, mode: mode) }

    var body: some View {
        #if os(watchOS)
        content
            .focusable(crownCount != nil)
            .digitalCrownRotation($crown, from: -1_000_000, through: 1_000_000, by: 1,
                                  sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)
            .onChange(of: crown) { _, value in
                let detent = Int(value.rounded())
                let delta = detent - lastDetent
                lastDetent = detent
                if delta != 0 { turn(by: delta) }
            }
            .onChange(of: model.pet.call) { old, new in
                if new != nil && old == nil && !model.pet.asleep {
                    WKInterfaceDevice.current().play(.notification)
                }
            }
            .onChange(of: model.message) { _, text in
                guard !text.isEmpty else { return }
                WKInterfaceDevice.current().play(hapticFor(text))
            }
            .onChange(of: model.mode) { _, _ in lastDetent = Int(crown.rounded()) }
        #else
        content
        #endif
    }

    // MARK: layout

    /// The system clock overlays the top right corner: nothing important is drawn in this band.
    private let topBand: CGFloat = 22
    /// The bottom corners are round.
    private let bottomBand: CGFloat = 8

    private var content: some View {
        GeometryReader { geo in
            let size = geo.size
            let fit = SceneFit(size: size, scale: displayScale, topInset: topBand)
            ZStack {
                Color.black
                LCDScreen(model: model, fullScreen: true, topInset: topBand, bottomInset: bottomBand)
                    .opacity(dimmed ? 0.62 : 1)
                if model.mode == .home && model.pet.isAlive {
                    overlays(size: size, fit: fit)
                        .allowsHitTesting(false)
                }
            }
            .frame(width: size.width, height: size.height)
            .contentShape(Rectangle())
            .gesture(SpatialTapGesture().onEnded { tap(at: $0.location, size: size, fit: fit) })
            .simultaneousGesture(LongPressGesture(minimumDuration: 0.45).onEnded { _ in hold() })
        }
        .environment(\.lcdPalette, colors)
        .ignoresSafeArea()
        .task(id: captionToken) {
            guard fades, captionToken > 0 else { return }
            try? await Task.sleep(nanoseconds: 3_500_000_000)
            if !Task.isCancelled { withAnimation(.easeOut(duration: 0.5)) { captionVisible = false } }
        }
        .onAppear { showCaption(Self.captionText(model)) }
        .onChange(of: model.message) { _, text in if !text.isEmpty { showCaption(text) } }
        .onChange(of: model.pet.statusLine) { _, _ in
            if model.message.isEmpty { showCaption(Self.captionText(model)) }
        }
    }

    // MARK: overlays

    private func overlays(size: CGSize, fit: SceneFit) -> some View {
        let unit: CGFloat = 2
        return ZStack {
            if !caption.isEmpty && !dimmed {
                VStack {
                    captionPanel(width: size.width - 20, unit: unit)
                        .padding(.top, topBand + 4)
                        .opacity(captionVisible || !fades ? 1 : 0)
                    Spacer(minLength: 0)
                }
            }
            VStack {
                Spacer(minLength: 0)
                actionPanel(unit: unit)
                    .padding(.bottom, bottomBand)
                    .opacity(dimmed ? 0.7 : 1)
            }
        }
        .frame(width: size.width, height: size.height)
    }

    /// The panel behind overlay text: translucent black with an ink hairline, square like a pixel.
    private func panel<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        content()
            .padding(.horizontal, 6)
            .padding(.vertical, 4)
            .background(Color.black.opacity(0.72))
            .overlay(Rectangle().strokeBorder(colors.ink.opacity(0.7), lineWidth: 1))
    }

    /// The selected action: its pixel icon, its name and where it sits in the list the crown turns through.
    private func actionPanel(unit: CGFloat) -> some View {
        let index = icons.firstIndex(of: model.selected) ?? 0
        return panel {
            HStack(spacing: 6) {
                PixelGlyphView(rows: model.selected.glyph, pixel: unit * 2, color: colors.ink)
                VStack(alignment: .leading, spacing: 4) {
                    PixelText(model.selected.label, pixel: unit, color: colors.ink)
                    HStack(spacing: 2) {
                        ForEach(0..<icons.count, id: \.self) { i in
                            Rectangle()
                                .fill(colors.ink.opacity(i == index ? 1 : 0.35))
                                .frame(width: 3, height: i == index ? 3 : 2)
                        }
                    }
                    .frame(height: 3, alignment: .center)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(model.selected.title)
        .accessibilityHint("Turn the Digital Crown to change, tap to do it")
        .accessibilityIdentifier("watch-action")
    }

    /// One or two lines of 2pt text, balanced.
    private func captionPanel(width: CGFloat, unit: CGFloat) -> some View {
        let inner = width - 12
        let lines = captionLines(caption, width: inner)
        return panel {
            VStack(spacing: lines.pixel) {
                ForEach(Array(lines.lines.enumerated()), id: \.offset) { _, line in
                    PixelText(line, pixel: lines.pixel, color: colors.ink)
                }
            }
        }
        .accessibilityIdentifier("watch-caption")
    }

    private func captionLines(_ text: String, width: CGFloat) -> (pixel: CGFloat, lines: [String]) {
        let fit = RetroFit.lines(text, width: width, maxPixel: 2, maxLines: 3)
        guard fit.pixel == 2, fit.lines.count > 1 else { return (fit.pixel, fit.lines) }
        let count = fit.lines.count
        var chars = RetroFit.maxChars(width: width, pixel: 2)
        while chars > 4, PixelFont.wrap(text, maxChars: chars - 1).count <= count { chars -= 1 }
        return (2, PixelFont.wrap(text, maxChars: chars))
    }

    /// The message if there is one, else what the pet is up to.
    static func captionText(_ model: GameModel) -> String {
        if !model.message.isEmpty { return model.message }
        if model.pet.stage == .egg && model.pet.isAlive { return "Egg warming up" }
        return model.pet.statusLine
    }

    private func showCaption(_ text: String) {
        caption = text
        captionVisible = true
        captionToken += 1
    }

    // MARK: input

    /// Rows the crown moves through on this screen; nil where it scrolls (stats, dex) or is unused (games).
    private var crownCount: Int? {
        WatchInput.crownCount(for: model.mode, playRows: MiniGames.menuRows.count, games: MiniGames.all.count,
                              families: Species.families.count)
    }

    private func turn(by delta: Int) {
        guard let count = crownCount else { return }
        switch model.mode {
        case .home:
            let i = icons.firstIndex(of: model.selected) ?? 0
            model.selected = icons[WatchInput.wrap(i, by: delta, count: count)]
        case .feedMenu, .chooseEgg:
            model.menuIndex = WatchInput.wrap(model.menuIndex, by: delta, count: count)
        case .playMenu:
            model.playSel = WatchInput.wrap(model.playSel, by: delta, count: count)
        case .scores:
            model.scoresPage = WatchInput.wrap(model.scoresPage, by: delta, count: count)
        default:
            break
        }
    }

    private func tap(at point: CGPoint, size: CGSize, fit: SceneFit) {
        if held { held = false; return }
        switch WatchInput.tapAction(mode: model.mode, phase: model.session?.phase) {
        case .confirm:
            click()
            model.confirm()
        case .gameScreen:
            click()
            model.tapGame(side: point.x < size.width / 2 ? -1 : 1)
        case .gameInput:
            guard let session = model.session, let game = session.game else { return }
            let zones = session.def.tapZones?(game) ?? session.def.tapRows
            var pet: (x: Double, half: Double, width: Double)?
            if let catcher = game as? CatchGame {
                pet = (catcher.state.petX, catcher.state.petW / 2, CatchGame.width)
            }
            model.sendGameInput(WatchInput.gameInput(gameID: session.def.id, tap: point, screen: size, fit: fit,
                                                     zones: zones, catchPet: pet))
        case .ignore:
            break
        }
    }

    private func hold() {
        held = true
        click()
        switch WatchInput.holdAction(mode: model.mode) {
        case .describe: model.describe(model.selected)
        case .back: model.cancel()
        case .quitGame: model.quitGame()
        }
    }

    private func click() {
        #if os(watchOS)
        if !dimmed { WKInterfaceDevice.current().play(.click) }
        #endif
    }

    #if os(watchOS)
    private func hapticFor(_ text: String) -> WKHapticType {
        let good = ["Yum", "Sweet", "Squeaky", "better", "behaves", "won", "learned", "purrs", "Lights"]
        let bad = ["Shh", "full", "Not now", "not sick", "confused", "Already", "too happy"]
        if bad.contains(where: { text.contains($0) }) { return .failure }
        if good.contains(where: { text.contains($0) }) { return .success }
        return .click
    }
    #endif
}

// MARK: - Complication notes (widgets live in Widget/)
//
// The watch widget extension target reuses the sources in Widget/ (written separately), so
// there is nothing to add here. Add the Widget/ files to the watchOS widget extension target
// as well, and make sure Shared/ files are members of it. See docs/watch-notes.md.
