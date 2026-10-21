import SwiftUI
import WatchKit

struct WatchContentView: View {
    @ObservedObject var model: GameModel
    @State private var crown: Double = 0

    private let icons = MenuIcon.allCases
    private let columns = [GridItem(.flexible(), spacing: 6), GridItem(.flexible(), spacing: 6)]

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                LCDScreen(model: model)

                Text(model.message)
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, minHeight: 28)

                LazyVGrid(columns: columns, spacing: 6) {
                    ForEach(icons, id: \.self) { icon in
                        Button {
                            tap(icon)
                        } label: {
                            VStack(spacing: 2) {
                                Image(systemName: icon.symbol)
                                    .font(.title3)
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
            .padding(.horizontal, 4)
        }
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
    }

    private func tap(_ icon: MenuIcon) {
        if icon == model.selected {
            WKInterfaceDevice.current().play(.click)
            model.confirm()
        } else {
            model.selected = icon
            syncCrown()
            WKInterfaceDevice.current().play(.click)
        }
    }

    private func syncCrown() {
        if let i = icons.firstIndex(of: model.selected) { crown = Double(i) }
    }

    private func hapticFor(_ text: String) -> WKHapticType {
        let good = ["Yum", "Sweet", "Squeaky", "better", "behaves", "won", "learned", "purrs", "Lights"]
        let bad = ["Shh", "full", "Not now", "not sick", "confused", "Already", "too happy"]
        if bad.contains(where: { text.contains($0) }) { return .failure }
        if good.contains(where: { text.contains($0) }) { return .success }
        return .click
    }
}

// MARK: - Complication notes
//
// The watch widget extension target reuses the sources in Widget/ (written separately), so
// there is nothing to add here. Add the Widget/ files to the watchOS widget extension target
// as well, and make sure Shared/ files are members of it. See docs/watch-notes.md.
