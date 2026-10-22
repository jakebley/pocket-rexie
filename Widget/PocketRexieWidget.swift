import SwiftUI
import WidgetKit
import AppIntents

// MARK: - Timeline

struct PetEntry: TimelineEntry {
    let date: Date
    let pet: Pet
}

enum WidgetPalette {
    static let lcd = Color(red: 0.62, green: 0.71, blue: 0.53)
    static let ink = Color(red: 0.17, green: 0.23, blue: 0.15)
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

private struct HeartsRow: View {
    let label: String
    let value: Int

    var body: some View {
        HStack(spacing: 4) {
            Text(label).font(.system(size: 10, weight: .bold, design: .monospaced))
            Text(heartString(value)).font(.system(size: 12, weight: .bold, design: .monospaced))
        }
        .foregroundStyle(WidgetPalette.ink)
    }
}

private struct ControlLabel: View {
    let title: String
    let symbol: String
    let emphasized: Bool

    var body: some View {
        Label(title, systemImage: symbol)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 5)
            .foregroundStyle(emphasized ? WidgetPalette.lcd : WidgetPalette.ink)
            .background(
                Capsule().fill(emphasized ? WidgetPalette.ink : WidgetPalette.ink.opacity(0.15))
            )
    }
}

// MARK: - Views

struct PocketRexieWidgetView: View {
    @Environment(\.widgetFamily) private var environmentFamily
    let entry: PetEntry
    /// Tests render outside a widget host, where the family cannot be set through the environment.
    var familyOverride: WidgetFamily?

    private var family: WidgetFamily { familyOverride ?? environmentFamily }

    private var pet: Pet { entry.pet }

    var body: some View {
        content
            .widgetURL(URL(string: "pocketrexie://"))
            .containerBackground(for: .widget) {
                background
            }
    }

    @ViewBuilder private var background: some View {
        switch family {
        case .accessoryCircular, .accessoryRectangular, .accessoryInline:
            Color.clear
        default:
            WidgetPalette.lcd
        }
    }

    @ViewBuilder private var content: some View {
        switch family {
        #if !os(watchOS)
        case .systemSmall:
            smallView
        case .systemMedium:
            mediumView
        #endif
        case .accessoryCircular:
            circularView
        case .accessoryRectangular:
            rectangularView
        case .accessoryInline:
            inlineView
        default:
            circularView
        }
    }

    #if !os(watchOS)
    private var smallView: some View {
        VStack(spacing: 4) {
            PetPixelView(pet: pet)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            if pet.isAlive && pet.stage != .egg {
                Text(heartString(pet.hunger) + " " + heartString(pet.happy))
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(WidgetPalette.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            } else {
                Text(pet.name)
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(WidgetPalette.ink)
            }
        }
    }

    private var mediumView: some View {
        HStack(spacing: 10) {
            PetPixelView(pet: pet)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            VStack(alignment: .leading, spacing: 4) {
                Text(pet.name)
                    .font(.system(size: 14, weight: .heavy, design: .monospaced))
                    .foregroundStyle(WidgetPalette.ink)
                    .lineLimit(1)
                Text(pet.statusLine)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundStyle(WidgetPalette.ink)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                if pet.isAlive && pet.stage != .egg {
                    HeartsRow(label: "FOOD", value: pet.hunger)
                    HeartsRow(label: "FUN ", value: pet.happy)
                    Spacer(minLength: 0)
                    controls
                } else {
                    Spacer(minLength: 0)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var controls: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Button(intent: FeedMealIntent()) {
                    ControlLabel(title: "Feed", symbol: "fork.knife", emphasized: pet.call == .hungry)
                }
                Button(intent: CleanIntent()) {
                    ControlLabel(title: "Clean", symbol: "sparkles", emphasized: pet.call == .poop)
                }
            }
            HStack(spacing: 4) {
                Button(intent: ToggleLightIntent()) {
                    ControlLabel(title: "Light", symbol: "lightbulb", emphasized: pet.call == .light)
                }
                Button(intent: MedicineIntent()) {
                    ControlLabel(title: "Meds", symbol: "cross.case", emphasized: pet.call == .sick)
                }
            }
        }
        .buttonStyle(.plain)
    }
    #endif

    private var circularView: some View {
        ZStack {
            AccessoryWidgetBackground()
            PetPixelView(pet: pet)
                .padding(4)
        }
    }

    private var rectangularView: some View {
        HStack(spacing: 6) {
            PetPixelView(pet: pet)
                .frame(width: 36, height: 36)
            VStack(alignment: .leading, spacing: 1) {
                Text(pet.name)
                    .font(.headline)
                    .lineLimit(1)
                Text(pet.statusLine)
                    .font(.caption2)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Text(heartString(pet.hunger) + " " + heartString(pet.happy))
                    .font(.caption2)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
    }

    private var inlineView: some View {
        Text("🦖 \(heartString(pet.hunger)) \(pet.statusLine)")
    }
}

// MARK: - Widget

struct PocketRexieWidget: Widget {
    static let kind = "PocketRexieWidget"

    private var families: [WidgetFamily] {
        #if os(watchOS)
        return [.accessoryCircular, .accessoryRectangular, .accessoryInline]
        #else
        return [.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline]
        #endif
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: PocketRexieWidget.kind, provider: PetProvider()) { entry in
            PocketRexieWidgetView(entry: entry)
        }
        .configurationDisplayName("Pocket Rexie")
        .description("Keep an eye on your pocket dino.")
        .supportedFamilies(families)
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
