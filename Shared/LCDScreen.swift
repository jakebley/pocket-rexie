import SwiftUI

/// The square green-gray LCD: animated pet plus menu, game and stats overlays.
struct LCDScreen: View {
    @ObservedObject var model: GameModel

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let font = min(18, max(9, side / 32 * 2.4))
            ZStack {
                LCDStyle.background
                screenCanvas
                modeOverlay(font: font)
                if model.pet.asleep && !model.pet.lightOn {
                    Color.black.opacity(0.5).allowsHitTesting(false)
                }
            }
            .frame(width: side, height: side)
            .clipShape(RoundedRectangle(cornerRadius: side * 0.04, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: side * 0.04, style: .continuous)
                    .stroke(LCDStyle.ink.opacity(0.35), lineWidth: 1)
                    .allowsHitTesting(false)
            )
            .position(x: geo.size.width / 2, y: geo.size.height / 2)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    // MARK: pixels

    private var screenCanvas: some View {
        TimelineView(.periodic(from: .now, by: 0.6)) { timeline in
            let frame = Int(timeline.date.timeIntervalSinceReferenceDate / 0.6)
            let pet = model.pet
            Canvas { ctx, size in
                ctx.fill(LCDPainter.gridPath(size: size), with: .color(LCDStyle.ink.opacity(0.06)))
                let ink = LCDPainter.inkPath(pet, size: size, blink: frame % 6 == 0,
                                             bob: frame % 2 == 1, alertOn: frame % 2 == 0)
                ctx.fill(ink, with: .color(LCDStyle.ink))
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { model.tapPet() }
        .accessibilityLabel(model.pet.statusLine)
    }

    // MARK: overlays

    @ViewBuilder
    private func modeOverlay(font: CGFloat) -> some View {
        switch model.mode {
        case .home:
            if !model.pet.isAlive { deadPanel(font) }
        case .feedMenu:
            feedPanel(font)
        case .play(let state):
            playPanel(state, font)
        case .stats:
            statsPanel(font)
        case .dex:
            dexPanel(font)
        }
    }

    private func mono(_ size: CGFloat, bold: Bool = false) -> Font {
        .system(size: size, weight: bold ? .bold : .regular, design: .monospaced)
    }

    private func panel<Content: View>(_ font: CGFloat, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(spacing: font * 0.5) { content() }
            .padding(font * 0.7)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(LCDStyle.background.opacity(0.96))
            .foregroundStyle(LCDStyle.ink)
            .font(mono(font))
    }

    private func deadPanel(_ font: CGFloat) -> some View {
        let cause = model.pet.causeOfDeath ?? "has passed on"
        return VStack {
            Text("\(model.pet.name) \(cause)")
                .font(mono(font * 0.9, bold: true))
                .multilineTextAlignment(.center)
                .foregroundStyle(LCDStyle.ink)
                .padding(.top, font * 0.6)
            Spacer()
            Button("Hatch a new egg") { model.startNewEgg() }
                .buttonStyle(LCDButtonStyle(selected: false, font: font))
        }
        .padding(font * 0.6)
    }

    private func feedPanel(_ font: CGFloat) -> some View {
        let titles = ["Meat", "Veggies", "Pasta", "Snack", "Cancel"]
        return panel(font) {
            Text("FEED").font(mono(font, bold: true))
            ForEach(0..<titles.count, id: \.self) { i in
                Button(titles[i]) {
                    model.menuIndex = i
                    model.confirm()
                }
                .buttonStyle(LCDButtonStyle(selected: model.menuIndex == i, font: font))
            }
        }
    }

    private func playPanel(_ s: GameModel.PlayState, _ font: CGFloat) -> some View {
        panel(font) {
            Text("ROUND \(s.round)/\(GameModel.rounds)  WINS \(s.wins)")
                .font(mono(font * 0.85, bold: true))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            HStack(spacing: font * 0.6) {
                Text("\(s.shown)").font(mono(font * 2.6, bold: true))
                Text(s.revealed == nil ? "?" : "to")
                    .font(mono(font))
                Text(s.revealed.map { "\($0)" } ?? "?")
                    .font(mono(font * 2.6, bold: true))
            }
            if let revealed = s.revealed {
                Text(s.lastWin ? "YOU WIN!" : "MISSED")
                    .font(mono(font, bold: true))
                let last = s.round >= GameModel.rounds
                Button(last ? "Done" : "Next") { model.continuePlay() }
                    .buttonStyle(LCDButtonStyle(selected: true, font: font))
                    .accessibilityHint("The number was \(revealed)")
            } else {
                HStack(spacing: font * 0.4) {
                    Button("Higher") { model.guess(higher: true) }
                        .buttonStyle(LCDButtonStyle(selected: s.pickHigher, font: font * 0.85))
                    Button("Lower") { model.guess(higher: false) }
                        .buttonStyle(LCDButtonStyle(selected: !s.pickHigher, font: font * 0.85))
                }
            }
            Button("Quit") { model.cancel() }
                .font(mono(font * 0.8))
                .buttonStyle(.plain)
                .underline()
        }
    }

    private func statsPanel(_ font: CGFloat) -> some View {
        let pet = model.pet
        let days = Int(pet.age / 86400)
        let hours = Int(pet.age / 3600) % 24
        let rows: [(String, String)] = [
            ("Name", "\(pet.name) #\(pet.generation)"),
            ("Species", pet.speciesName),
            ("Age", "\(days)d \(hours)h"),
            ("Weight", "\(pet.weight)g"),
            ("Smarts", "\(pet.smarts)"),
            ("Discipline", "\(pet.discipline)"),
            ("Care miss", "\(pet.careMistakes)"),
            ("Diet M/V/P", "\(pet.stageMeat)/\(pet.stageVeg)/\(pet.stagePasta)"),
            ("Trained", "\(pet.stageTrain)"),
            ("Wins", "\(pet.wins)/\(pet.battles)"),
        ]
        return panel(font) {
            HStack(spacing: font * 0.4) {
                Button("Back") { model.cancel() }
                    .buttonStyle(LCDButtonStyle(selected: true, font: font * 0.85))
                Button("Dex") { model.openDex() }
                    .buttonStyle(LCDButtonStyle(selected: false, font: font * 0.85))
            }
            ScrollView {
                VStack(alignment: .leading, spacing: font * 0.3) {
                    ForEach(rows, id: \.0) { row in
                        HStack(spacing: 4) {
                            Text(row.0)
                            Spacer(minLength: 2)
                            Text(row.1).fontWeight(.bold)
                        }
                    }
                    Text("LEGACY").fontWeight(.bold).padding(.top, font * 0.4)
                    if pet.legacy.isEmpty {
                        Text("None yet")
                    } else {
                        ForEach(Array(pet.legacy.enumerated()), id: \.offset) { _, line in
                            Text(line)
                        }
                    }
                }
                .font(mono(font * 0.85))
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func dexPanel(_ font: CGFloat) -> some View {
        let found = Set(model.pet.dex)
        let stages: [(String, Stage)] = [("BABY", .baby), ("CHILD", .child), ("TEEN", .teen), ("ADULT", .adult), ("ULTIMATE", .ultimate)]
        return panel(font) {
            HStack(spacing: font * 0.4) {
                Button("Back") { model.openStats() }
                    .buttonStyle(LCDButtonStyle(selected: true, font: font * 0.85))
                Text("DEX \(found.count)/\(Species.dexSize)")
                    .font(mono(font * 0.9, bold: true))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
            ScrollView {
                VStack(alignment: .leading, spacing: font * 0.3) {
                    ForEach(stages, id: \.0) { title, stage in
                        Text(title).fontWeight(.bold).padding(.top, font * 0.3)
                        ForEach(Species.all.filter { $0.stage == stage }, id: \.id) { sp in
                            Text(found.contains(sp.id) ? sp.name : "???")
                        }
                    }
                }
                .font(mono(font * 0.85))
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

/// Flat LCD-style button: ink outline, inverted when selected or pressed.
private struct LCDButtonStyle: ButtonStyle {
    let selected: Bool
    let font: CGFloat

    func makeBody(configuration: Configuration) -> some View {
        let inverted = selected || configuration.isPressed
        return configuration.label
            .font(.system(size: font, weight: .bold, design: .monospaced))
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .foregroundStyle(inverted ? LCDStyle.background : LCDStyle.ink)
            .padding(.horizontal, font * 0.5)
            .padding(.vertical, font * 0.25)
            .frame(maxWidth: .infinity)
            .background(inverted ? LCDStyle.ink : Color.clear)
            .overlay(Rectangle().stroke(LCDStyle.ink, lineWidth: max(1, font * 0.1)))
    }
}
