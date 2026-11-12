import SwiftUI
#if os(watchOS)
import WatchKit
#endif

struct WatchContentView: View {
    @ObservedObject var model: GameModel
    /// Explicit LCD palette (tests). Otherwise the light LCD, or the backlit one in Always-On.
    let palette: LCDPalette?
    @State private var crown: Double = 0
    /// A hold already described the icon, so the release must not also act.
    @State private var described = false
    @Environment(\.displayScale) private var displayScale
    /// The look, synced from the phone (see PetSync); Traditional until the phone says otherwise.
    @AppStorage(ColorModeStore.key, store: PetStore.defaults) private var mode: ColorMode = .traditional

    init(model: GameModel, palette: LCDPalette? = nil) {
        self.model = model
        self.palette = palette
    }

    private let icons = MenuIcon.allCases

    /// The watch UI is always dark, so it uses the phone's dark palette in the synced look
    /// (Traditional or Technicolor), in Always-On too.
    private var colors: LCDPalette { palette ?? LCDStyle.palette(for: .dark, mode: mode) }

    var body: some View {
        #if os(watchOS)
        content
            .focusable()
            .digitalCrownRotation($crown, from: 0, through: Double(icons.count - 1), by: 1,
                                  sensitivity: .medium, isContinuous: true, isHapticFeedbackEnabled: true)
            .onChange(of: crown) { _, value in
                let index = min(max(Int(value.rounded()), 0), icons.count - 1)
                if icons[index] != model.selected { model.selected = icons[index] }
            }
            .onChange(of: model.message) { _, text in
                guard !text.isEmpty else { return }
                WKInterfaceDevice.current().play(hapticFor(text))
            }
            .onChange(of: model.pet.call) { old, new in
                if new != nil && old == nil && !model.pet.asleep {
                    WKInterfaceDevice.current().play(.notification)
                }
            }
            .onAppear { syncCrown() }
        #else
        content
        #endif
    }

    // MARK: layout

    /// Side margin of the whole face (the watch corners are round).
    private let margin: CGFloat = 8
    /// Extra inset of the tile row, which sits in the bottom corners.
    private let tileInset: CGFloat = 2
    private let top: CGFloat = 6
    private let bottom: CGFloat = 8
    private let gap: CGFloat = 3
    private let tileGap: CGFloat = 2
    private let tileHeight: CGFloat = 34
    /// Hearts (14) + 1 line of text (10) + gap, or two lines of text (21).
    private let infoHeight: CGFloat = 27

    /// The LCD face fills the screen: scene on top (the largest whole-pixel square that fits),
    /// hearts and a centred caption, and a row of labelled tiles.
    private var content: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let inner = width - margin * 2
            let tilesWidth = inner - tileInset * 2
            let tiles = tilesWidth >= 168 ? 4 : 3
            let tileWidth = floor((tilesWidth - tileGap * CGFloat(tiles - 1)) / CGFloat(tiles))
            let room = geo.size.height - top - bottom - tileHeight - infoHeight - gap * 2
            let side = sceneSide(room: room, width: inner)
            VStack(spacing: gap) {
                LCDScreen(model: model)
                    .frame(width: side, height: side)
                    .retroGlass(colors, corner: 8)
                info(width: inner)
                    .frame(width: inner, height: infoHeight)
                tileRow(count: tiles, tileWidth: tileWidth)
                    .padding(.horizontal, tileInset)
            }
            .padding(.horizontal, margin)
            .padding(.top, top)
            .frame(width: width, height: geo.size.height, alignment: .top)
        }
        .environment(\.lcdPalette, colors)
        .background(RetroBackdrop(palette: colors, inset: 1, corner: 28).ignoresSafeArea())
    }

    /// The scene is 64 cells wide; it is sized to a whole number of device pixels per cell so it stays crisp.
    private func sceneSide(room: CGFloat, width: CGFloat) -> CGFloat {
        let scale = max(displayScale, 1)
        let fit = max(40, min(room, width))
        let step = 64 / scale
        let snapped = (fit / step).rounded(.down) * step
        return max(step, snapped)
    }

    /// Hearts over a one-line caption, or a two-line caption alone when the text is long.
    private func info(width: CGFloat) -> some View {
        let text = model.message.isEmpty ? model.pet.statusLine : model.message
        let lines = captionLines(text, width: width)
        let showMeters = lines.pixel == 2 && lines.lines.count == 1
            && model.pet.isAlive && model.pet.stage != .egg
        return VStack(spacing: 3) {
            if showMeters {
                HStack(spacing: 0) {
                    RetroMeter(kind: .heart7, filled: model.pet.hunger, pixel: 2)
                    Spacer(minLength: 4)
                    RetroMeter(kind: .smile5, filled: model.pet.happy, pixel: 2)
                }
                .frame(width: width - 4)
            }
            VStack(spacing: lines.pixel) {
                ForEach(Array(lines.lines.enumerated()), id: \.offset) { _, line in
                    PixelText(line, pixel: lines.pixel)
                }
            }
        }
        .frame(width: width, height: infoHeight, alignment: showMeters ? .top : .center)
    }

    /// 2pt pixels on one line when it fits; else two lines of balanced length ("AN EGG IS" / "WARMING UP");
    /// else 1pt pixels for very long texts.
    private func captionLines(_ text: String, width: CGFloat) -> (pixel: CGFloat, lines: [String]) {
        let fit = RetroFit.lines(text, width: width, maxPixel: 2, maxLines: 2)
        guard fit.pixel == 2, fit.lines.count == 2 else { return (fit.pixel, fit.lines) }
        var chars = RetroFit.maxChars(width: width, pixel: 2)
        while chars > 4, PixelFont.wrap(text, maxChars: chars - 1).count <= 2 { chars -= 1 }
        return (2, PixelFont.wrap(text, maxChars: chars))
    }

    /// Short labels so they fit a tile at a legible pixel size.
    private func watchLabel(_ icon: MenuIcon) -> String {
        switch icon {
        case .medicine: return "MEDS"
        case .climate: return "TEMP"
        case .battle: return "FIGHT"
        default: return icon.label
        }
    }

    /// The largest pixel size (2, else 1) at which `text` fits a tile.
    private func labelPixel(_ text: String, tileWidth: CGFloat) -> CGFloat {
        CGFloat(PixelFont.width(of: text)) * 2 + 4 <= tileWidth ? 2 : 1
    }

    /// A window onto the menu that follows the selection, so the selected tile is always visible.
    private func tileRow(count: Int, tileWidth: CGFloat) -> some View {
        let selectedIndex = icons.firstIndex(of: model.selected) ?? 0
        let start = min(max(selectedIndex - 1, 0), max(0, icons.count - count))
        let visible = Array(icons[start..<min(start + count, icons.count)])
        return HStack(spacing: tileGap) {
            ForEach(visible) { icon in
                Button {
                    if described { described = false; return }
                    tap(icon)
                } label: {
                    EmptyView()
                }
                .buttonStyle(RetroTileStyle(icon: icon, title: watchLabel(icon), selected: icon == model.selected, glyphPixel: 2,
                                            labelPixel: labelPixel(watchLabel(icon), tileWidth: tileWidth),
                                            width: tileWidth, height: tileHeight))
                .simultaneousGesture(
                    LongPressGesture(minimumDuration: 0.3).onEnded { _ in
                        described = true
                        click()
                        model.describe(icon)
                    }
                )
                .accessibilityLabel(icon.title)
                .accessibilityHint("Hold to see what it does")
                .accessibilityIdentifier("watch-" + icon.title.lowercased())
            }
        }
    }

    private func tap(_ icon: MenuIcon) {
        if icon == model.selected {
            click()
            model.confirm()
        } else {
            model.selected = icon
            syncCrown()
            click()
        }
    }

    private func click() {
        #if os(watchOS)
        WKInterfaceDevice.current().play(.click)
        #endif
    }

    private func syncCrown() {
        if let i = icons.firstIndex(of: model.selected) { crown = Double(i) }
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
