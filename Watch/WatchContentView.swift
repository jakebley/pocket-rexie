import SwiftUI
#if os(watchOS)
import WatchKit
#endif

struct WatchContentView: View {
    @ObservedObject var model: GameModel
    @State private var crown: Double = 0
    @Environment(\.sceneDate) private var sceneDate

    private let icons = MenuIcon.allCases
    private var iconRows: [[MenuIcon]] {
        stride(from: 0, to: icons.count, by: 2).map { Array(icons[$0..<min($0 + 2, icons.count)]) }
    }

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

    @ViewBuilder private var content: some View {
        if sceneDate == nil {
            ScrollView { column }
        } else {
            // Fixed-clock renders (ImageRenderer draws ScrollView as nothing): show the top of the column.
            column.frame(maxHeight: .infinity, alignment: .top).clipped()
        }
    }

    private var column: some View {
            VStack(spacing: 8) {
                LCDScreen(model: model)

                Text(model.message)
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, minHeight: 28)

                Grid(horizontalSpacing: 6, verticalSpacing: 6) {
                    ForEach(iconRows.indices, id: \.self) { r in
                      GridRow {
                        ForEach(iconRows[r], id: \.self) { icon in
                        Button {
                            tap(icon)
                        } label: {
                            VStack(spacing: 2) {
                                PixelGlyphView(rows: icon.glyph, pixel: 2,
                                               color: icon == model.selected ? LCDStyle.ink : LCDStyle.background)
                                    .padding(4)
                                    .background(
                                        Rectangle().fill(icon == model.selected ? LCDStyle.background : Color.clear)
                                    )
                                Text(icon.title)
                                    .font(.system(size: 11))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.7)
                            }
                            .frame(maxWidth: .infinity, minHeight: 52)
                        }
                        .buttonStyle(.bordered)
                        .tint(icon == model.selected ? Color.green : Color.gray)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.green, lineWidth: icon == model.selected ? 2 : 0)
                        )
                        }
                      }
                    }
                }
            }
            .padding(.horizontal, 4)
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
