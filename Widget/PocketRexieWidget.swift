import SwiftUI
import WidgetKit
import AppIntents

// MARK: - Timeline

struct PetEntry: TimelineEntry {
    let date: Date
    let pet: Pet
}

private func samplePet() -> Pet {
    var p = Pet(now: Date().addingTimeInterval(-20 * 3600))
    p.stage = .child
    p.species = "rawr"
    p.named = true
    p.hunger = 3
    p.happy = 2
    p.weight = 12
    p.lastTick = Date()
    return p
}

struct PetProvider: TimelineProvider {
    func placeholder(in context: Context) -> PetEntry {
        PetEntry(date: Date(), pet: samplePet())
    }

    func getSnapshot(in context: Context, completion: @escaping (PetEntry) -> Void) {
        if context.isPreview {
            completion(PetEntry(date: Date(), pet: samplePet()))
        } else {
            let now = Date()
            completion(PetEntry(date: now, pet: PetStore.load(now: now)))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PetEntry>) -> Void) {
        let now = Date()
        var pet = PetStore.load(now: now)
        var entries = [PetEntry(date: now, pet: pet)]
        for i in 1...12 {
            let date = now.addingTimeInterval(Double(i) * 15 * 60)
            pet.advance(to: date)
            entries.append(PetEntry(date: date, pet: pet))
        }
        let last = entries.last?.date ?? now.addingTimeInterval(3 * 3600)
        completion(Timeline(entries: entries, policy: .after(last)))
    }
}

// MARK: - Shared bits

private func heartString(_ n: Int) -> String {
    let filled = max(0, min(Pet.maxHearts, n))
    return String(repeating: "♥", count: filled) + String(repeating: "♡", count: Pet.maxHearts - filled)
}

// MARK: - Views

/// A tiny LCD toy window. Home screen families are an LCD face (ground colour, ink bezel, scanlines,
/// pixel text and pixel glyph buttons); backlit (dark ground, light ink) in dark mode. Accessory
/// families are ink-only pixel pets that the system can tint.
struct PocketRexieWidgetView: View {
    @Environment(\.widgetFamily) private var environmentFamily
    @Environment(\.colorScheme) private var scheme
    let entry: PetEntry
    /// Tests render outside a widget host, where the family cannot be set through the environment.
    var familyOverride: WidgetFamily?

    private var family: WidgetFamily { familyOverride ?? environmentFamily }

    private var pet: Pet { entry.pet }
    private var living: Bool { pet.isAlive && pet.stage != .egg }

    private var isAccessory: Bool {
        #if os(watchOS)
        return true
        #else
        return family == .accessoryCircular || family == .accessoryRectangular || family == .accessoryInline
        #endif
    }

    private var palette: LCDPalette {
        isAccessory ? LCDPalette(background: .clear, ink: Color.primary) : LCDStyle.palette(for: scheme)
    }

    var body: some View {
        content
            .environment(\.lcdPalette, palette)
            .widgetURL(URL(string: "pocketrexie://"))
            .containerBackground(for: .widget) {
                if isAccessory {
                    Color.clear
                } else {
                    RetroBackdrop(palette: palette)
                }
            }
    }

    @ViewBuilder private var content: some View {
        switch family {
        #if !os(watchOS)
        case .systemSmall:
            GeometryReader { geo in smallView(geo.size) }
        case .systemMedium:
            GeometryReader { geo in mediumView(geo.size) }
        case .systemLarge:
            GeometryReader { geo in largeView(geo.size) }
        #endif
        case .accessoryCircular:
            circularView
        case .accessoryRectangular:
            rectangularView
        case .accessoryInline:
            inlineView
        #if os(watchOS)
        case .accessoryCorner:
            cornerView
        #endif
        default:
            circularView
        }
    }

    // MARK: pieces

    /// "Name" line for pets without meters (egg, ghost).
    private var restLabel: String {
        pet.stage == .egg ? "EGG" : (pet.isAlive ? pet.name : pet.name + " R.I.P.")
    }

    private func scene(_ side: CGFloat) -> some View {
        PetPixelView(pet: pet, palette: palette)
            .frame(width: side, height: side)
            .retroGlass(palette)
    }

    /// Hunger hearts on the left, fun smiles on the right.
    private func meterRow(pixel: CGFloat, width: CGFloat) -> some View {
        HStack(spacing: 0) {
            RetroMeter(kind: .heart7, filled: pet.hunger, pixel: pixel)
            Spacer(minLength: pixel * 2)
            RetroMeter(kind: .smile5, filled: pet.happy, pixel: pixel)
        }
        .frame(width: width, height: 7 * pixel)
    }

    #if !os(watchOS)
    private func inner(_ size: CGSize) -> CGSize {
        CGSize(width: size.width - RetroMetrics.contentPad * 2, height: size.height - RetroMetrics.contentPad * 2)
    }

    private func smallView(_ size: CGSize) -> some View {
        let box = inner(size)
        let rowH: CGFloat = 14
        let side = min(box.width, box.height - rowH - 5)
        return VStack(spacing: 5) {
            scene(side)
            if living {
                meterRow(pixel: 2, width: box.width)
            } else {
                RetroCaption(text: restLabel, width: box.width, maxPixel: 2, maxLines: 1, centered: true)
                    .frame(height: rowH)
            }
        }
        .frame(width: size.width, height: size.height)
    }

    private func mediumView(_ size: CGSize) -> some View {
        let box = inner(size)
        let gap: CGFloat = 8
        let side = box.height
        let colW = box.width - side - gap
        return HStack(spacing: gap) {
            scene(side)
            VStack(alignment: .leading, spacing: 5) {
                RetroCaption(text: pet.name, width: colW, maxPixel: 2, maxLines: 1)
                RetroCaption(text: pet.statusLine, width: colW, maxPixel: 2, maxLines: 2)
                if living { meterRow(pixel: 2, width: colW) }
                Spacer(minLength: 0)
                if living { buttons(width: colW, tileH: 38, glyphPixel: 2, labelMax: 2) }
            }
            .frame(width: colW, height: box.height, alignment: .topLeading)
        }
        .frame(width: size.width, height: size.height)
    }

    private func largeView(_ size: CGSize) -> some View {
        let box = inner(size)
        let spacing: CGFloat = 7
        let headerH: CGFloat = 15
        let meterH: CGFloat = 21
        let tileH: CGFloat = 52
        let fixed = headerH + (living ? meterH + tileH + spacing * 2 : 0) + spacing
        let side = min(box.width, box.height - fixed)
        return VStack(spacing: spacing) {
            RetroCaption(text: living ? pet.statusLine : restLabel, width: box.width,
                         maxPixel: 3, maxLines: 1, centered: true)
                .frame(height: headerH)
            scene(side)
            if living {
                meterRow(pixel: 3, width: box.width)
                buttons(width: box.width, tileH: tileH, glyphPixel: 3, labelMax: 2)
            }
        }
        .frame(width: size.width, height: size.height)
    }

    /// Four interactive glyph tiles. A tile is inverted when its action is what the pet is asking for.
    private func buttons(width: CGFloat, tileH: CGFloat, glyphPixel: CGFloat, labelMax: Int) -> some View {
        let gap: CGFloat = 4
        let tileW = floor((width - gap * 3) / 4)
        let label = RetroFit.pixel(for: "CLEAN", width: tileW - 4, max: labelMax)
        return HStack(spacing: gap) {
            Button(intent: FeedMealIntent()) {
                PixelTile(icon: .feed, title: "FEED", inverted: pet.call == .hungry,
                          glyphPixel: glyphPixel, labelPixel: label, width: tileW, height: tileH)
            }
            Button(intent: CleanIntent()) {
                PixelTile(icon: .clean, title: "CLEAN", inverted: pet.call == .poop,
                          glyphPixel: glyphPixel, labelPixel: label, width: tileW, height: tileH)
            }
            Button(intent: ToggleLightIntent()) {
                PixelTile(icon: .light, title: "LIGHT", inverted: pet.call == .light,
                          glyphPixel: glyphPixel, labelPixel: label, width: tileW, height: tileH)
            }
            Button(intent: MedicineIntent()) {
                PixelTile(icon: .medicine, title: "MEDS", inverted: pet.call == .sick,
                          glyphPixel: glyphPixel, labelPixel: label, width: tileW, height: tileH)
            }
        }
        .buttonStyle(.plain)
    }
    #endif

    // MARK: accessory

    /// Sprite pixel size for a square of `side`: whole points, or half points when it is tiny.
    private func spritePixel(_ side: CGFloat, share: CGFloat = 0.66) -> CGFloat {
        let raw = side * share / 16
        return max(1, raw >= 2 ? floor(raw) : floor(raw * 2) / 2)
    }

    private var circularView: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let px = spritePixel(side)
            let hp = max(1, floor(px * 0.66 * 2) / 2)
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: max(2, px)) {
                    PixelPetView(pet: pet, pixel: px)
                    if living { RetroMeter(kind: .heart5, filled: pet.hunger, pixel: hp) }
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    private var rectangularView: some View {
        GeometryReader { geo in
            let px = spritePixel(geo.size.height, share: 0.7)
            let textW = geo.size.width - 16 * px - 8
            HStack(spacing: 6) {
                PixelPetView(pet: pet, pixel: px)
                VStack(alignment: .leading, spacing: 3) {
                    RetroCaption(text: pet.statusLine, width: textW, maxPixel: 2, maxLines: 2)
                    if living {
                        RetroMeter(kind: .heart5, filled: pet.hunger, pixel: 2)
                        RetroMeter(kind: .smile5, filled: pet.happy, pixel: 2)
                    }
                }
                .frame(width: textW, alignment: .leading)
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .leading)
        }
    }

    private var inlineView: some View {
        Group {
            #if os(iOS)
            if let icon = inlineIcon {
                Label { Text(pet.statusLine) } icon: { icon }
            } else {
                Text(heartString(pet.hunger) + " " + pet.statusLine)
            }
            #else
            Text(heartString(pet.hunger) + " " + pet.statusLine)
            #endif
        }
    }

    #if os(iOS)
    /// Inline widgets only take text and images: the pixel pet and its hearts as a template image.
    private var inlineIcon: Image? {
        let strip = HStack(spacing: 2) {
            PixelPetView(pet: pet, pixel: 1, color: .black)
            if living { RetroMeter(kind: .heart5, filled: pet.hunger, pixel: 1, color: .black) }
        }
        let renderer = ImageRenderer(content: strip)
        renderer.scale = 3
        guard let image = renderer.uiImage else { return nil }
        return Image(uiImage: image).renderingMode(.template)
    }
    #endif

    #if os(watchOS)
    private var cornerView: some View {
        GeometryReader { geo in
            let px = spritePixel(min(geo.size.width, geo.size.height), share: 0.8)
            PixelPetView(pet: pet, pixel: px)
                .frame(width: geo.size.width, height: geo.size.height)
        }
        .widgetLabel(heartString(pet.hunger) + " " + heartString(pet.happy))
    }
    #endif
}

// MARK: - Widget

struct PocketRexieWidget: Widget {
    static let kind = "PocketRexieWidget"

    private var families: [WidgetFamily] {
        #if os(watchOS)
        return [.accessoryCircular, .accessoryRectangular, .accessoryCorner, .accessoryInline]
        #else
        return [.systemSmall, .systemMedium, .systemLarge,
                .accessoryCircular, .accessoryRectangular, .accessoryInline]
        #endif
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: PocketRexieWidget.kind, provider: PetProvider()) { entry in
            PocketRexieWidgetView(entry: entry)
        }
        .configurationDisplayName("Pocket Rexie")
        .description("Keep an eye on your pocket dino.")
        .supportedFamilies(families)
        .contentMarginsDisabled()
    }
}

#if !RENDER_TESTS
@main
struct PocketRexieWidgetBundle: WidgetBundle {
    var body: some Widget {
        PocketRexieWidget()
    }
}
#endif
