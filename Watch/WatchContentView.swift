import SwiftUI
#if os(watchOS)
import WatchKit
#endif

struct WatchContentView: View {
    @ObservedObject var model: GameModel
    /// Explicit LCD palette (tests). Otherwise the light LCD, or the backlit one in Always-On.
    let palette: LCDPalette?
    @State private var crown: Double = 0
    @Environment(\.isLuminanceReduced) private var dimmed

    init(model: GameModel, palette: LCDPalette? = nil) {
        self.model = model
        self.palette = palette
    }

    private let icons = MenuIcon.allCases

    private var colors: LCDPalette { palette ?? (dimmed ? LCDStyle.dark : LCDStyle.light) }

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

    private let margin: CGFloat = 3
    private let tileGap: CGFloat = 3
    private let tileHeight: CGFloat = 40
    private let meterHeight: CGFloat = 14
    private let captionHeight: CGFloat = 11

    /// The LCD face fills the screen: scene on top, a pixel status line, hearts, and a row of glyph tiles.
    private var content: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let inner = width - margin * 2
            let tiles = width >= 176 ? 4 : 3
            let tileWidth = floor((inner - tileGap * CGFloat(tiles - 1)) / CGFloat(tiles))
            let gaps: CGFloat = 3 * 3
            let side = max(40, min(inner, geo.size.height - captionHeight - meterHeight - tileHeight - gaps - margin))
            VStack(spacing: 3) {
                LCDScreen(model: model)
                    .frame(width: side, height: side)
                    .retroGlass(colors, corner: 8)
                caption(width: inner)
                    .frame(height: captionHeight)
                meters(width: inner)
                    .frame(height: meterHeight)
                tileRow(count: tiles, tileWidth: tileWidth)
            }
            .padding(.horizontal, margin)
            .frame(width: width, height: geo.size.height, alignment: .top)
        }
        .environment(\.lcdPalette, colors)
        .background(RetroBackdrop(palette: colors, inset: 1, corner: 28).ignoresSafeArea())
    }

    /// One line at 2pt pixels when it fits, else two lines at 1pt.
    private func caption(width: CGFloat) -> some View {
        let text = model.message.isEmpty ? model.pet.statusLine : model.message
        let single = RetroFit.lines(text, width: width, maxPixel: 2, maxLines: 1)
        return RetroCaption(text: text, width: width, maxPixel: 2, maxLines: single.fits ? 1 : 2, centered: true)
    }

    @ViewBuilder private func meters(width: CGFloat) -> some View {
        if model.pet.isAlive && model.pet.stage != .egg {
            HStack(spacing: 0) {
                RetroMeter(kind: .heart7, filled: model.pet.hunger, pixel: 2)
                Spacer(minLength: 4)
                RetroMeter(kind: .smile5, filled: model.pet.happy, pixel: 2)
            }
            .frame(width: width)
        } else {
            Color.clear
        }
    }

    /// A window onto the menu that follows the selection, so the selected tile is always visible.
    private func tileRow(count: Int, tileWidth: CGFloat) -> some View {
        let selectedIndex = icons.firstIndex(of: model.selected) ?? 0
        let start = min(max(selectedIndex - 1, 0), max(0, icons.count - count))
        let visible = Array(icons[start..<min(start + count, icons.count)])
        return HStack(spacing: tileGap) {
            ForEach(visible) { icon in
                Button {
                    tap(icon)
                } label: {
                    EmptyView()
                }
                .buttonStyle(RetroTileStyle(icon: icon, selected: icon == model.selected, glyphPixel: 3,
                                            width: tileWidth, height: tileHeight))
                .accessibilityLabel(icon.title)
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

// MARK: - Complication notes
//
// The watch widget extension target reuses the sources in Widget/ (written separately), so
// there is nothing to add here. Add the Widget/ files to the watchOS widget extension target
// as well, and make sure Shared/ files are members of it. See docs/watch-notes.md.
