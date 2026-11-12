import SwiftUI

/// Scale of the LCD overlays: `unit` is one text pixel in points, about side / 64 rounded down
/// to a whole device pixel so the pixel font stays crisp.
struct Metrics {
    let unit: CGFloat
    let side: CGFloat

    init(side: CGFloat, displayScale: CGFloat) {
        let scale = max(displayScale, 1)
        self.side = side
        self.unit = max(1 / scale, (side / 64 * scale).rounded(.down) / scale)
    }

    var pad: CGFloat { unit * 3 }
    /// Characters of 3x5 text that fit on one line inside the padding.
    var cap: Int { max(8, Int(((side - pad * 2) / unit + 1) / 4)) }
}

private struct SceneDateKey: EnvironmentKey {
    static let defaultValue: Date? = nil
}

extension EnvironmentValues {
    /// A fixed time for the scene (tests and previews). nil means the live timeline clock.
    var sceneDate: Date? {
        get { self[SceneDateKey.self] }
        set { self[SceneDateKey.self] = newValue }
    }
}

/// The square green-gray LCD: animated pet plus menu, game and stats overlays.
struct LCDScreen: View {
    @ObservedObject var model: GameModel
    @Environment(\.displayScale) private var displayScale
    @Environment(\.lcdPalette) private var palette
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.sceneDate) private var sceneDate
    /// The behaviour director lives here (a class, so stepping it never invalidates the view).
    @State private var director = SceneDirector()
    /// Square corners and a full-strength ink hairline (the phone layout). Otherwise a softly
    /// rounded screen (watch).
    var framed = false
    /// The watch: the view fills its whole (taller) frame. The scene keeps whole device pixels and is topped and
    /// footed with its own sky and soil; text screens are full-screen panels. Taps are the host's business.
    var fullScreen = false
    /// Full screen only: room kept free at the top for the system clock.
    var topInset: CGFloat = 0
    /// Full screen only: room kept free at the bottom of text screens (the round corners).
    var bottomInset: CGFloat = 0

    var body: some View {
        if fullScreen { fullBody } else { squareBody }
    }

    private var fullBody: some View {
        GeometryReader { geo in
            let fit = SceneFit(size: geo.size, scale: displayScale, topInset: topInset)
            let metrics = Metrics(side: min(geo.size.width, geo.size.height), displayScale: displayScale)
            let textScreen = showsTextScreen
            ZStack {
                palette.background
                screenCanvas(side: fit.side, fit: fit)
                if palette.backlit && palette.mode == .traditional && !model.pet.lightOn && model.pet.isAlive {
                    palette.background.opacity(0.55).allowsHitTesting(false)
                }
                if model.pet.asleep && !model.pet.lightOn && model.mode != .home {
                    Color.black.opacity(0.5).allowsHitTesting(false)
                }
                if textScreen || model.mode == .home {
                    modeOverlay(metrics)
                        .padding(.top, topInset)
                        .padding(.bottom, bottomInset)
                        .background(textScreen ? palette.background : Color.clear)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    /// A text screen (menu, stats, ready, result...) that replaces the scene; false for the scene itself and a game in play.
    private var showsTextScreen: Bool {
        switch model.mode {
        case .home: return false
        case .game: return model.session?.phase == .ready || model.session?.phase == .result
        default: return true
        }
    }

    private var squareBody: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let metrics = Metrics(side: side, displayScale: displayScale)
            ZStack {
                palette.background
                screenCanvas(side: side)
                if palette.backlit && palette.mode == .traditional && !model.pet.lightOn && model.pet.isAlive {
                    palette.background.opacity(0.55).allowsHitTesting(false)
                }
                modeOverlay(metrics)
                if model.pet.asleep && !model.pet.lightOn && model.mode != .home {
                    Color.black.opacity(0.5).allowsHitTesting(false)
                }
            }
            .frame(width: side, height: side)
            .clipShape(RoundedRectangle(cornerRadius: framed ? 0 : side * 0.04, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: framed ? 0 : side * 0.04, style: .continuous)
                    .stroke(palette.ink.opacity(framed ? 1 : 0.35), lineWidth: 1)
                    .allowsHitTesting(false)
            )
            .position(x: geo.size.width / 2, y: geo.size.height / 2)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    // MARK: pixels

    private func screenCanvas(side: CGFloat, fit: SceneFit? = nil) -> some View {
        // The scene steps at 8 fps (one director tick); it pauses off screen and behind text screens.
        // While a mini-game plays, the canvas repaints at 20 fps from the session (the model steps it); otherwise the scene.
        let playing = model.mode == .game && (model.session?.phase == .play || model.session?.phase == .over)
        let paused = scenePhase != .active || (model.mode != .home && !playing) || sceneDate != nil
        return TimelineView(.animation(minimumInterval: playing ? 0.05 : SceneState.tickLength, paused: paused)) { timeline in
            let pet = model.pet
            let flash = model.evolutionFlash
            let hatchedAt = model.hatchedAt
            let date = sceneDate ?? timeline.date
            let tick = model.gameTick
            let raster = frameRaster(playing: playing, hasFlash: flash != nil, pet: pet, date: date, hatchedAt: hatchedAt, tick: tick)
            Canvas { ctx, size in
                if let fit {
                    surround(&ctx, size: size, fit: fit, raster: flash == nil ? raster : nil)
                    ctx.translateBy(x: fit.origin.x, y: fit.origin.y)
                    LCDScene.render(&ctx, size: CGSize(width: fit.side, height: fit.side), raster: raster, flash: flash,
                                    date: date, palette: palette)
                } else {
                    LCDScene.render(&ctx, size: size, raster: raster, flash: flash, date: date,
                                    palette: palette)
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { location in if fit == nil { handleTap(location, side: side) } }
        .onChange(of: model.sceneEvents) { _, events in
            guard !events.isEmpty else { return }
            director.events.append(contentsOf: events)
            model.sceneEvents.removeAll()
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(model.pet.statusLine)
        .accessibilityValue(GameModel.deterministic ? uiTestValue : "")
        .accessibilityIdentifier("lcd")
    }

    /// Full screen: the sky above and the soil below the scene continue to the edges of the screen (Technicolor).
    /// Traditional is ink on the plain LCD ground, which is already there.
    private func surround(_ ctx: inout GraphicsContext, size: CGSize, fit: SceneFit, raster: SceneRaster?) {
        guard palette.mode != .traditional, let raster, raster.hasSky else { return }
        let appearance = palette.appearance
        let ground = fit.origin.y + CGFloat(raster.groundRow) * fit.cell
        let skyRect = CGRect(x: 0, y: 0, width: size.width, height: ground)
        let soilRect = CGRect(x: 0, y: ground, width: size.width, height: max(0, size.height - ground))
        let sky = ScenePalette.sky(mode: palette.mode, appearance: appearance, hour: raster.hour,
                                   weather: raster.weather, biome: raster.biome)
        ctx.fill(Path(skyRect), with: .color(sky.color))
        ctx.fill(Path(soilRect), with: .color(ScenePalette.soil(mode: palette.mode, appearance: appearance, biome: raster.biome).color))
        if raster.dim {
            var both = Path()
            both.addRect(skyRect)
            both.addRect(soilRect)
            ctx.fill(both, with: .color(ScenePalette.dimInk.color.opacity(ScenePalette.dimSky)))
        }
    }

    /// The picture for this frame: the running mini-game, the living scene, or nothing while the evolution flash plays.
    private func frameRaster(playing: Bool, hasFlash: Bool, pet: Pet, date: Date, hatchedAt: Date?, tick: Int) -> SceneRaster? {
        _ = tick  // read in the timeline so a game step repaints even when the timeline is paused
        if playing, let session = model.session {
            return MiniPaint.frame(session: session, pet: pet, ms: date.timeIntervalSinceReferenceDate * 1000)
        }
        if hasFlash { return nil }
        return director.frame(pet: pet, date: date, reducedMotion: reduceMotion, hatchedAt: hatchedAt, look: palette.mode)
    }

    /// The model's summary plus the active look ("... look technicolor name Rexie"), for UI tests.
    private var uiTestValue: String {
        let summary = model.uiTestSummary
        guard let range = summary.range(of: " name ") else { return summary }
        return summary.replacingCharacters(in: range, with: " look \(palette.mode.rawValue) name ")
    }

    /// Tap on the pet pets it; on the ground the pet walks over and looks; in the sky it looks up.
    private func handleTap(_ location: CGPoint, side: CGFloat) {
        guard side > 0 else { return }
        let cx = Double(location.x / side) * Double(LCDPainter.grid)
        let cy = Double(location.y / side) * Double(LCDPainter.grid)
        let pet = model.pet
        if model.mode == .game {
            model.tapGame(side: cx < Double(LCDPainter.grid) / 2 ? -1 : 1)
            return
        }
        if pet.stage == .egg || !pet.isAlive {
            model.tapPet()
            return
        }
        let place = SceneRenderer.placement(pet: pet, state: director.state, frame: 0, motion: false,
                                            override: nil)
        let onPet = cx >= Double(place.left - 3) && cx <= Double(place.right + 3)
            && cy >= Double(place.inkTop - 3) && cy <= Double(place.bottom + 3)
        if onPet {
            model.tapPet()
        } else if cy >= Double(SceneRaster.groundY - 5) {
            director.tap = .ground(x: cx)
        } else {
            director.tap = .sky
        }
    }

    // MARK: overlays

    @ViewBuilder
    private func modeOverlay(_ m: Metrics) -> some View {
        switch model.mode {
        case .home:
            if !model.pet.isAlive { deadPanel(m) }
        case .feedMenu:
            feedPanel(m)
        case .play(let state):
            playPanel(state, m)
        case .stats:
            if model.statsPage == 0 { statusPanel(m) } else { detailPanel(m) }
        case .dex:
            dexPanel(m)
        case .chooseEgg:
            chooserPanel(m)
        case .playMenu:
            PlayMenuPanel(model: model, m: m)
        case .game:
            GamePanel(model: model, m: m)
        case .scores:
            ScoresPanel(model: model, m: m)
        }
    }

    private func panel<Content: View>(_ m: Metrics, spacing: CGFloat? = nil,
                                      @ViewBuilder _ content: () -> Content) -> some View {
        VStack(spacing: spacing ?? m.unit * 2) { content() }
            .padding(m.pad)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(palette.background)
    }

    private func deadPanel(_ m: Metrics) -> some View {
        let cause = model.pet.causeOfDeath ?? "has passed on"
        return VStack(spacing: m.unit * 2) {
            // On its own ground so the sky and the ghost never run through the words.
            PixelParagraph(text: "\(model.pet.name) \(cause)", pixel: m.unit, maxChars: m.cap, centered: true)
                .padding(m.unit * 2)
                .background(palette.background)
                .overlay(Rectangle().strokeBorder(palette.ink, lineWidth: 1))
                .padding(.top, m.unit)
            Spacer(minLength: 0)
            PixelButton("NEW EGG", pixel: m.unit, selected: true) { model.requestNewEgg() }
        }
        .padding(m.pad)
    }

    private func feedPanel(_ m: Metrics) -> some View {
        let titles = Species.foodLabels(family: model.pet.family).map { $0.uppercased() } + ["SNACK", "CANCEL"]
        return panel(m, spacing: m.unit) {
            PixelText("FEED", pixel: m.unit)
                .padding(.bottom, m.unit)
            ForEach(0..<titles.count, id: \.self) { i in
                PixelButton(titles[i], pixel: m.unit, selected: model.menuIndex == i, outlined: false) {
                    model.menuIndex = i
                    model.confirm()
                }
            }
            Spacer(minLength: 0)
        }
    }

    /// Choose your egg: one row per family (it scrolls: there are eleven); "+" marks a Plus family
    /// that is still locked. Names are cut to one line of the pixel font.
    private func chooserPanel(_ m: Metrics) -> some View {
        let ents = model.entitlements
        let cancelIndex = Species.families.count
        return panel(m, spacing: m.unit) {
            PixelText("CHOOSE EGG", pixel: m.unit)
            ScrollViewReader { proxy in
                MaybeScroll {
                    VStack(spacing: m.unit) {
                        ForEach(Array(Species.families.enumerated()), id: \.element.id) { i, fam in
                            let locked = !ents.canHatch(family: fam.id)
                            PixelButton(String((locked ? "+ " + fam.name : fam.name).prefix(m.cap)).uppercased(),
                                        pixel: m.unit, selected: model.menuIndex == i, outlined: false) {
                                model.menuIndex = i
                                model.confirm()
                            }
                            .id(i)
                        }
                        PixelButton("CANCEL", pixel: m.unit, selected: model.menuIndex == cancelIndex,
                                    outlined: false) {
                            model.menuIndex = cancelIndex
                            model.confirm()
                        }
                        .id(cancelIndex)
                    }
                }
                .onChange(of: model.menuIndex) { _, index in
                    withAnimation { proxy.scrollTo(index, anchor: .center) }
                }
            }
            PixelText("+ NEEDS PLUS", pixel: m.unit)
        }
    }

    private func playPanel(_ s: GameModel.PlayState, _ m: Metrics) -> some View {
        let u = m.unit
        return panel(m) {
            PixelText("ROUND \(s.round)/\(GameModel.rounds)", pixel: u)
            HStack(spacing: u * 3) {
                PixelText("\(s.shown)", pixel: u * 3)
                PixelText(s.revealed == nil ? "?" : "TO", pixel: u)
                PixelText(s.revealed.map { "\($0)" } ?? "?", pixel: u * 3)
            }
            .frame(height: u * 15)
            if let revealed = s.revealed {
                PixelText(s.lastWin ? "YOU WIN!" : "MISSED", pixel: u)
                PixelButton(s.round >= GameModel.rounds ? "DONE" : "NEXT", pixel: u, selected: true) {
                    model.continuePlay()
                }
                .accessibilityHint("The number was \(revealed)")
            } else {
                HStack(spacing: u) {
                    PixelButton("HIGHER", pixel: u, selected: s.pickHigher) { model.guess(higher: true) }
                    PixelButton("LOWER", pixel: u, selected: !s.pickHigher) { model.guess(higher: false) }
                }
            }
            Spacer(minLength: 0)
            HStack(spacing: u * 2) {
                PixelButton("QUIT", pixel: u) { model.cancel() }
                    .frame(width: u * 20)
                Spacer(minLength: 0)
                PixelText("WINS \(s.wins)", pixel: u)
            }
        }
    }

    /// Page one, like the original: hearts, discipline, weight and age.
    private func statusPanel(_ m: Metrics) -> some View {
        let pet = model.pet
        let u = m.unit
        let days = Int(pet.age / 86400)
        let hours = Int(pet.age / 3600) % 24
        return panel(m) {
            HStack(spacing: u) {
                PixelText(String(pet.name.prefix(10)), pixel: u)
                Spacer(minLength: 0)
                PixelText("#\(pet.generation)", pixel: u)
            }
            HStack(spacing: u) {
                PixelText("HUNGER", pixel: u)
                Spacer(minLength: 0)
                PixelMeter(filled: pet.hunger, total: Pet.maxHearts,
                           full: Sprite.heartFull, empty: Sprite.heartEmpty, pixel: u)
            }
            HStack(spacing: u) {
                PixelText("HAPPY", pixel: u)
                Spacer(minLength: 0)
                PixelMeter(filled: pet.happy, total: Pet.maxHearts,
                           full: Sprite.smileFull, empty: Sprite.smileEmpty, pixel: u)
            }
            PixelPair(label: "DISC", value: "\(pet.discipline)%", pixel: u, cap: m.cap)
            PixelPair(label: "WEIGHT", value: "\(pet.weight)G", pixel: u, cap: m.cap)
            PixelPair(label: "AGE", value: "\(days)D \(hours)H", pixel: u, cap: m.cap)
            Spacer(minLength: 0)
            HStack(spacing: u) {
                PixelButton("EXIT", pixel: u) { model.cancel() }
                PixelButton("NEXT", pixel: u, selected: true) { model.setStatsPage(1) }
            }
        }
    }

    /// Page two: the detail list.
    private func detailPanel(_ m: Metrics) -> some View {
        let pet = model.pet
        let u = m.unit
        let days = Int(pet.age / 86400)
        let hours = Int(pet.age / 3600) % 24
        let rows: [(String, String)] = [
            ("NAME", "\(pet.name) #\(pet.generation)"),
            ("SPECIES", pet.speciesName),
            ("AGE", "\(days)D \(hours)H"),
            ("WEIGHT", "\(pet.weight)G"),
            ("SMARTS", "\(pet.smarts)"),
            ("DISC", "\(pet.discipline)"),
            ("CARE MISS", "\(pet.careMistakes)"),
            ("DIET M/V/P", "\(pet.stageMeat)/\(pet.stageVeg)/\(pet.stagePasta)"),
            ("TRAINED", "\(pet.stageTrain)"),
            ("WINS", "\(pet.wins)/\(pet.battles)"),
        ]
        return panel(m) {
            HStack(spacing: u) {
                PixelButton("BACK", pixel: u, selected: true) { model.setStatsPage(0) }
                PixelButton("DEX", pixel: u) { model.openDex() }
            }
            MaybeScroll {
                VStack(alignment: .leading, spacing: u * 2) {
                    ForEach(rows, id: \.0) { row in
                        PixelPair(label: row.0, value: row.1, pixel: u, cap: m.cap)
                    }
                    PixelText("LEGACY", pixel: u)
                        .padding(.top, u * 2)
                    if pet.legacy.isEmpty {
                        PixelText("NONE YET", pixel: u)
                    } else {
                        ForEach(Array(pet.legacy.enumerated()), id: \.offset) { _, line in
                            PixelParagraph(text: line, pixel: u, maxChars: m.cap)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func dexPanel(_ m: Metrics) -> some View {
        let u = m.unit
        let family = model.dexFamily ?? model.pet.family
        let locked = !model.entitlements.canHatch(family: family)
        let found = Set(model.pet.dex.filter { Species.named($0)?.family == family })
        let stages: [(String, Stage)] = [("BABY", .baby), ("CHILD", .child), ("TEEN", .teen),
                                         ("ADULT", .adult), ("ULTIMATE", .ultimate)]
        return panel(m) {
            HStack(spacing: u * 2) {
                PixelButton("BACK", pixel: u, selected: true) { model.openStats() }
                    .frame(width: u * 20)
                PixelText("DEX \(found.count)/\(Species.dexSize(family: family))", pixel: u)
                Spacer(minLength: 0)
            }
            if model.eggChooserAvailable {
                // family switch; a locked family nobody has found anything in is marked "+"
                PixelButton(String(((locked && found.isEmpty ? "+ " : "") + family).prefix(m.cap)).uppercased(),
                            pixel: u) { model.cycleDexFamily() }
            }
            MaybeScroll {
                VStack(alignment: .leading, spacing: u * 2) {
                    ForEach(stages, id: \.0) { title, stage in
                        PixelText("-\(title)-", pixel: u)
                            .padding(.top, u * 2)
                        ForEach(Species.all.filter { $0.stage == stage && $0.family == family }, id: \.id) { sp in
                            PixelParagraph(text: found.contains(sp.id) ? sp.name : "???",
                                           pixel: u, maxChars: m.cap)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

// MARK: - pieces

enum UITestFlags {
    /// UI tests pin the scene clock but still drive a real ScrollView.
    nonisolated(unsafe) static var forceScroll = false
}

/// A vertical ScrollView, except when the scene has a fixed clock (tests and previews rendered with
/// ImageRenderer, which draws ScrollView content as nothing): then the content is laid out from the
/// top and clipped, which is what the viewer sees before scrolling.
struct MaybeScroll<Content: View>: View {
    @Environment(\.sceneDate) private var sceneDate
    @ViewBuilder let content: () -> Content

    var body: some View {
        if sceneDate == nil || UITestFlags.forceScroll {
            ScrollView(showsIndicators: false) { content() }
        } else {
            Color.clear
                .overlay(alignment: .top) {
                    content().fixedSize(horizontal: false, vertical: true)
                }
                .clipped()
        }
    }
}

/// Label on the left, value on the right; stacked when they do not fit on one line.
private struct PixelPair: View {
    let label: String
    let value: String
    let pixel: CGFloat
    let cap: Int

    var body: some View {
        if label.count + value.count + 1 <= cap {
            HStack(spacing: pixel) {
                PixelText(label, pixel: pixel)
                Spacer(minLength: pixel)
                PixelText(value, pixel: pixel)
            }
        } else {
            VStack(alignment: .leading, spacing: pixel) {
                PixelText(label, pixel: pixel)
                PixelParagraph(text: value, pixel: pixel, maxChars: max(1, cap - 2))
                    .padding(.leading, pixel * 2)
            }
        }
    }
}

/// A row of 5x5 hearts (or smileys), `filled` of `total` lit.
private struct PixelMeter: View {
    let filled: Int
    let total: Int
    let full: [String]
    let empty: [String]
    let pixel: CGFloat
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        Canvas { ctx, _ in
            var path = Path()
            for i in 0..<total {
                PixelBitmap.add(i < filled ? full : empty,
                                origin: CGPoint(x: CGFloat(i * 6) * pixel, y: 0),
                                pixel: pixel, to: &path)
            }
            ctx.fill(path, with: .color(palette.ink))
        }
        .frame(width: CGFloat(max(total, 1) * 6 - 1) * pixel, height: 5 * pixel)
        .accessibilityElement()
        .accessibilityLabel("\(filled) of \(total)")
    }
}

// MARK: - animation

/// Owns the scene's behaviour state between frames and turns it into a raster.
final class SceneDirector {
    var state = SceneState()
    /// Events handed over by the model, played on the next step.
    var events: [SceneEvent] = []
    var tap: SceneTap?

    /// Advance to `date` and draw. Safe to call more than once per tick.
    func frame(pet: Pet, date: Date, reducedMotion: Bool, hatchedAt: Date?,
               calendar: Calendar = .current, look: ColorMode = .traditional) -> SceneRaster {
        var options = SceneRenderOptions()
        options.look = look
        options.reducedMotion = reducedMotion
        options.calendar = calendar

        var inputs = SceneInputs()
        inputs.events = events
        inputs.tap = tap
        inputs.reducedMotion = reducedMotion
        inputs.raining = SceneAmbient(seed: pet.seed, date: date, calendar: calendar).weather == .rain
        events = []
        tap = nil
        state.step(pet: pet, inputs: inputs, now: date)

        // Hatching: for a few seconds the new baby alternates with a cracked shell.
        if pet.stage == .baby, let hatchedAt, date.timeIntervalSince(hatchedAt) < 4,
           Int(date.timeIntervalSinceReferenceDate / 0.6) % 2 == 0 {
            options.spriteOverride = look == .technicolor ? Sprite96.crackEgg : LCDPainter.crackEgg
        }
        return SceneRenderer.render(pet: pet, state: state, date: date, options: options)
    }
}

/// Draws one frame of the pet screen. Not tied to a view, so it can run inside a Canvas.
enum LCDScene {
    static func render(_ ctx: inout GraphicsContext, size: CGSize, raster: SceneRaster?,
                       flash: (from: String, to: String)?, date: Date,
                       palette: LCDPalette = LCDStyle.light) {
        let t = date.timeIntervalSinceReferenceDate

        // Evolution: old and new sprite alternate while the whole screen blinks inverted.
        if let flash {
            let step = Int(t / 0.2)
            let inverted = (step / 2) % 2 == 0
            let id = step % 2 == 0 ? flash.from : flash.to
            let big = palette.mode == .technicolor
            let n = SceneGrid.n(for: palette.mode)
            // Technicolor: the 48x48 Scale3x frame at the centre of the 96 grid; Traditional: the 32x32 frame on the 64 grid
            let rows: [String] = big ? Sprite96.firstFrame(id: id) : (Species.named(id)?.hiFrames.first ?? Sprite.eggHi)
            let sprite = LCDPainter.glyphPath(rows, x: big ? 24 : 16, y: big ? 24 : 16, size: size, n: n)
            if inverted {
                ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(palette.ink))
                ctx.fill(sprite, with: .color(palette.background))
            } else {
                ctx.fill(LCDPainter.gridPath(size: size, n: n), with: .color(palette.ink.opacity(0.06)))
                ctx.fill(sprite, with: .color(palette.ink))
            }
            return
        }

        guard let raster else {
            ctx.fill(LCDPainter.gridPath(size: size, n: SceneGrid.n(for: palette.mode)), with: .color(palette.ink.opacity(0.06)))
            return
        }
        LCDPainter.paint(&ctx, raster: raster, size: size, palette: palette)
    }
}
