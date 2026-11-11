import SwiftUI

// The Play screens drawn as LCD panels (menu, ready, result, HIGH SCORES), in the same pixel-font style as the Feed menu.
// The games themselves are painted into the 64x64 raster (see MiniGames/MiniPaint.swift) and shown by LCDScreen.

/// Panel chrome shared by the Play screens (the same as LCDScreen's own panels).
struct PlayPanel<Content: View>: View {
    let m: Metrics
    var spacing: CGFloat?
    @ViewBuilder let content: () -> Content
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        VStack(spacing: spacing ?? m.unit * 2) { content() }
            .padding(m.pad)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(palette.background)
    }
}

/// Play menu: the registered games (a star on the pet's favourite), HIGH SCORES, CANCEL.
struct PlayMenuPanel: View {
    @ObservedObject var model: GameModel
    let m: Metrics
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        let rows = MiniGames.menuRows
        let fav = MiniTuning.favourite(of: model.pet)
        PlayPanel(m: m, spacing: m.unit) {
            PixelText("PLAY", pixel: m.unit)
                .padding(.bottom, m.unit)
            ScrollViewReader { proxy in
                MaybeScroll {
                    VStack(spacing: m.unit) {
                        ForEach(0..<rows.count, id: \.self) { i in
                            menuRow(i, title: rows[i], favourite: fav)
                                .id(i)
                        }
                    }
                }
                .onChange(of: model.playSel) { _, index in
                    withAnimation { proxy.scrollTo(index, anchor: .center) }
                }
            }
        }
    }

    private func menuRow(_ i: Int, title: String, favourite: String?) -> some View {
        let selected = model.playSel == i
        let isFav = i < MiniGames.all.count && MiniGames.all[i].def.id == favourite
        return ZStack(alignment: .trailing) {
            PixelButton(title, pixel: m.unit, selected: selected, outlined: false) { model.chooseMenuRow(i) }
            if isFav {
                PixelGlyphView(rows: MiniPaint.star5, pixel: m.unit, color: selected ? palette.background : palette.ink)
                    .padding(.trailing, m.unit * 3)
                    .allowsHitTesting(false)
            }
        }
    }
}

/// What is on the LCD besides the painted game: the ready screen, the result, or the tap rows of a menu-like game.
struct GamePanel: View {
    @ObservedObject var model: GameModel
    let m: Metrics

    var body: some View {
        if let s = model.session {
            switch s.phase {
            case .ready: ReadyPanel(model: model, m: m, session: s)
            case .result: ResultPanel(model: model, m: m, session: s)
            case .play:
                let rows: [TapRow] = s.game.flatMap { g in s.def.tapZones?(g) } ?? s.def.tapRows
                if rows.isEmpty {
                    Color.clear.allowsHitTesting(false)
                } else {
                    TapRowsOverlay(rows: rows) { model.pickRow($0) }
                }
            case .over: Color.clear.allowsHitTesting(false)
            }
        }
    }
}

/// Invisible tap targets over the rows of a menu-like game (HI-LO's HIGHER and LOWER), with accessibility ids.
struct TapRowsOverlay: View {
    let rows: [TapRow]
    let onPick: (Int) -> Void

    var body: some View {
        GeometryReader { geo in
            let cell = geo.size.width / CGFloat(SceneRaster.side)
            ForEach(Array(rows.enumerated()), id: \.offset) { i, row in
                Color.clear
                    .contentShape(Rectangle())
                    .frame(width: cell * CGFloat(row.w), height: cell * CGFloat(row.h))
                    .position(x: cell * (CGFloat(row.x) + CGFloat(row.w) / 2), y: cell * (CGFloat(row.y) + CGFloat(row.h) / 2))
                    .onTapGesture { onPick(i) }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(row.id.uppercased())
                    .accessibilityAddTraits(.isButton)
                    .accessibilityIdentifier("px-" + row.id)
            }
        }
    }
}

struct ReadyPanel: View {
    @ObservedObject var model: GameModel
    let m: Metrics
    let session: MiniSession
    @Environment(\.lcdPalette) private var palette

    private static let conditions: [Tuning.Condition: String] = [
        .heavy: "A BIT HEAVY", .hungry: "TUMMY GRUMBLES", .sick: "FEELING SICK",
    ]

    var body: some View {
        let u = m.unit
        let th = session.params.theme
        let title = th.title(session.def.id, fallback: session.def.name)
        let best = model.scoreStore.best(session.def.id, species: model.pet.species)
        PlayPanel(m: m) {
            PixelText(String(title.prefix(m.cap)), pixel: u)
            ForEach(Array(session.def.rules(th).prefix(3).enumerated()), id: \.offset) { _, line in
                PixelParagraph(text: line, pixel: u, maxChars: m.cap)
            }
            if session.params.scoreMul > 1 {
                HStack(spacing: u * 2) {
                    PixelGlyphView(rows: MiniPaint.star5, pixel: u)
                    PixelText("FAVE X\(String(format: "%g", session.params.scoreMul))", pixel: u)
                    Spacer(minLength: 0)
                }
            }
            if let cond = ReadyPanel.conditions[session.params.tuning.condition] {
                HStack { PixelText(cond, pixel: u); Spacer(minLength: 0) }
            }
            Spacer(minLength: 0)
            HStack { PixelText(best.map { "BEST \($0.score)" } ?? "NO BEST YET", pixel: u); Spacer(minLength: 0) }
            HStack(spacing: u) {
                PixelButton("BACK", pixel: u) { model.backToPlayMenu() }
                PixelButton("START", pixel: u, selected: true) { model.startGame() }
            }
        }
    }
}

struct ResultPanel: View {
    @ObservedObject var model: GameModel
    let m: Metrics
    let session: MiniSession
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        let u = m.unit
        if let r = session.result {
            PlayPanel(m: m, spacing: u) {
                HStack(spacing: u) {
                    ForEach(0..<r.rank.rawValue, id: \.self) { _ in
                        PixelGlyphView(rows: MiniPaint.star5, pixel: u)
                    }
                }
                .frame(height: u * 5)
                PixelText(r.rank.label, pixel: u)
                PixelText("\(r.score)", pixel: u * 2)
                PixelParagraph(text: r.winLine, pixel: u, maxChars: m.cap, centered: true)
                if r.recordOverall {
                    PixelText("NEW RECORD!", pixel: u)
                } else if r.recordSpecies {
                    PixelText(String("\(r.speciesName) BEST!".uppercased().prefix(m.cap)), pixel: u)
                }
                ForEach(Array(r.reward.lines.prefix(2).enumerated()), id: \.offset) { _, line in
                    PixelText(line, pixel: u)
                }
                Spacer(minLength: 0)
                HStack(spacing: u) {
                    PixelButton("MENU", pixel: u) { model.backToPlayMenu() }
                    PixelButton("DONE", pixel: u, selected: true) { model.goHome() }
                }
            }
        }
    }
}

struct ScoresPanel: View {
    @ObservedObject var model: GameModel
    let m: Metrics

    var body: some View {
        let u = m.unit
        let games = MiniGames.all
        let pages = max(1, games.count)
        let page = min(model.scoresPage, pages - 1)
        PlayPanel(m: m, spacing: u) {
            HStack(spacing: u) {
                PixelText("HIGH SCORES", pixel: u)
                Spacer(minLength: 0)
                PixelText("\(page + 1)/\(pages)", pixel: u)
            }
            if page < games.count {
                let def = games[page].def
                HStack(spacing: u) {
                    PixelText(def.name, pixel: u)
                    Spacer(minLength: 0)
                    PixelText(def.unit, pixel: u)
                }
                scoreBlock("ALL PETS", model.scoreStore.best(def.id))
                scoreBlock(model.pet.stage == .egg ? "THIS PET" : "THIS SPECIES",
                           model.scoreStore.best(def.id, species: model.pet.species))
            } else {
                PixelText("NO GAMES", pixel: u)
            }
            Spacer(minLength: 0)
            HStack(spacing: u) {
                PixelButton("NEXT", pixel: u) { model.cycleSelection() }
                PixelButton("BACK", pixel: u, selected: true) { model.backToPlayMenu() }
            }
        }
    }

    private func scoreBlock(_ label: String, _ e: MiniScoreEntry?) -> some View {
        let u = m.unit
        return VStack(spacing: u) {
            HStack(spacing: u) {
                PixelText(label, pixel: u)
                Spacer(minLength: 0)
                PixelText(e.map { "\($0.score)" } ?? "--", pixel: u * 2)
            }
            HStack {
                PixelText(e.map { String("\($0.name) \($0.speciesName)".uppercased().prefix(m.cap)) } ?? " ", pixel: u)
                Spacer(minLength: 0)
            }
        }
    }
}
