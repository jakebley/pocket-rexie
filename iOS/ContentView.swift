import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var model = GameModel()
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.colorScheme) private var scheme
    @State private var showSettings = false
    @State private var nameDraft = "Rexie"

    private var needsName: Bool { model.pet.stage == .baby && !model.pet.named }

    private static let palettes: [(light: Color, dark: Color)] = [
        (Color(red: 0.74, green: 0.92, blue: 0.84), Color(red: 0.45, green: 0.76, blue: 0.70)),
        (Color(red: 0.98, green: 0.80, blue: 0.86), Color(red: 0.88, green: 0.55, blue: 0.70)),
        (Color(red: 0.80, green: 0.85, blue: 0.99), Color(red: 0.52, green: 0.58, blue: 0.88)),
        (Color(red: 0.99, green: 0.92, blue: 0.70), Color(red: 0.92, green: 0.72, blue: 0.40)),
    ]

    var body: some View {
        ZStack(alignment: .topTrailing) {
            background.ignoresSafeArea()

            GeometryReader { geo in
                let width = max(220, min(geo.size.width - 32, (geo.size.height - 24) * 0.78, 460))
                VStack {
                    Spacer(minLength: 0)
                    toy(width: width, height: width / 0.78)
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity)
            }

            Button {
                Haptics.tap()
                showSettings = true
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.title3)
                    .padding(12)
            }
            .accessibilityLabel("Settings")
            .padding(.trailing, 4)
        }
        .sheet(isPresented: $showSettings) {
            SettingsView(model: model)
                .presentationDetents([.medium, .large])
        }
        .alert("Your dino hatched!", isPresented: Binding(get: { needsName }, set: { _ in })) {
            TextField("Name", text: $nameDraft)
            Button("Name it") { model.rename(nameDraft) }
            Button("Keep \(model.pet.name)") { model.rename(model.pet.name) }
        } message: {
            Text("What will you call it?")
        }
        .onAppear {
            model.onSave = { Notifier.reschedule($0) }
            Notifier.reschedule(model.pet)
            if model.pet.stage != .egg { Notifier.requestAuthorizationIfNeeded() }
        }
        .onChange(of: needsName, initial: true) { _, needs in
            if needs { nameDraft = model.pet.name }
        }
        .onChange(of: model.pet.stage) { old, new in
            if old == .egg && new != .egg {
                Notifier.requestAuthorizationIfNeeded()
                Haptics.success()
            }
        }
        .onChange(of: model.pet.species) { old, new in
            if !old.isEmpty && !new.isEmpty {
                Beeper.shared.jingle()
                Haptics.success()
            }
        }
        .onChange(of: model.pet.call) { old, new in
            if old == nil && new != nil && model.pet.needsAttention {
                Beeper.shared.jingle()
                Haptics.success()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { model.reloadFromStore(); model.refresh() }
        }
    }

    // MARK: pieces

    private var background: some View {
        LinearGradient(
            colors: scheme == .dark
                ? [Color(red: 0.09, green: 0.10, blue: 0.14), Color(red: 0.15, green: 0.11, blue: 0.17)]
                : [Color(red: 0.93, green: 0.96, blue: 1.0), Color(red: 1.0, green: 0.94, blue: 0.97)],
            startPoint: .top, endPoint: .bottom)
    }

    private func toy(width w: CGFloat, height h: CGFloat) -> some View {
        let palette = Self.palettes[max(0, model.pet.generation - 1) % Self.palettes.count]
        let inner = w * 0.56
        return ZStack {
            EggShape()
                .fill(LinearGradient(colors: [palette.light, palette.dark], startPoint: .topLeading, endPoint: .bottomTrailing))
            Speckle().clipShape(EggShape())
            EggShape().stroke(Color.white.opacity(0.55), lineWidth: 2)

            VStack(spacing: h * 0.014) {
                iconRow(Array(MenuIcon.allCases.prefix(5)), width: inner)
                lcdBezel(side: inner * 0.95)
                iconRow(Array(MenuIcon.allCases.suffix(5)), width: inner)
                messageLine(width: inner, height: w * 0.075)
                buttons(width: w)
            }
            .offset(y: h * 0.02)
        }
        .frame(width: w, height: h)
        .shadow(color: .black.opacity(0.25), radius: 14, y: 8)
    }

    private func iconRow(_ icons: [MenuIcon], width: CGFloat) -> some View {
        // Whole points per glyph pixel keep the 8x8 icons crisp.
        let glyphPixel = max(2, (width * 0.1 / 8).rounded(.down))
        return HStack(spacing: 0) {
            ForEach(icons) { icon in
                let isSelected = model.selected == icon
                Button {
                    Haptics.tap()
                    Beeper.shared.blip()
                    model.perform(icon)
                } label: {
                    PixelGlyphView(rows: icon.glyph, pixel: glyphPixel,
                                   color: isSelected ? LCDStyle.background : LCDStyle.ink)
                        .frame(width: width / 5, height: width * 0.16)
                        .background(
                            Rectangle()
                                .fill(isSelected ? LCDStyle.ink : Color.clear)
                                .padding(2)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(icon.title)
            }
        }
        .frame(width: width)
    }

    private func lcdBezel(side: CGFloat) -> some View {
        LCDScreen(model: model)
            .frame(width: side, height: side)
            .padding(side * 0.04)
            .background(RoundedRectangle(cornerRadius: side * 0.07, style: .continuous).fill(Color(white: 0.16)))
            .overlay(
                RoundedRectangle(cornerRadius: side * 0.07, style: .continuous)
                    .stroke(Color.white.opacity(0.25), lineWidth: 1)
            )
    }

    private func messageLine(width: CGFloat, height: CGFloat) -> some View {
        let text = model.message.isEmpty ? model.pet.statusLine : model.message
        return Text(text)
            .font(.system(size: max(11, height * 0.5), weight: .semibold, design: .monospaced))
            .foregroundStyle(LCDStyle.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .padding(.horizontal, 10)
            .frame(width: width, height: height)
            .background(Capsule().fill(LCDStyle.background))
            .overlay(Capsule().stroke(Color.black.opacity(0.25), lineWidth: 1))
    }

    private func buttons(width w: CGFloat) -> some View {
        let size = w * 0.15
        return HStack(spacing: w * 0.07) {
            plasticButton("A", size: size) { model.cycleSelection() }
            plasticButton("B", size: size) { model.confirm() }
                .offset(y: size * 0.3)
            plasticButton("C", size: size) { model.cancel() }
        }
        .padding(.top, 2)
    }

    private func plasticButton(_ label: String, size: CGFloat, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            Beeper.shared.blip()
            action()
        } label: {
            Text(label)
                .font(.system(size: size * 0.36, weight: .heavy, design: .rounded))
                .foregroundStyle(Color.black.opacity(0.55))
                .frame(width: size, height: size)
        }
        .buttonStyle(PlasticButtonStyle())
        .accessibilityLabel("Button \(label)")
    }
}

// MARK: - shell drawing

/// A tall egg, narrower at the top.
struct EggShape: Shape {
    func path(in r: CGRect) -> Path {
        let w = r.width
        let h = r.height
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addCurve(to: CGPoint(x: r.maxX, y: r.minY + h * 0.62),
                   control1: CGPoint(x: r.midX + w * 0.42, y: r.minY),
                   control2: CGPoint(x: r.maxX, y: r.minY + h * 0.30))
        p.addCurve(to: CGPoint(x: r.midX, y: r.maxY),
                   control1: CGPoint(x: r.maxX, y: r.minY + h * 0.88),
                   control2: CGPoint(x: r.midX + w * 0.30, y: r.maxY))
        p.addCurve(to: CGPoint(x: r.minX, y: r.minY + h * 0.62),
                   control1: CGPoint(x: r.midX - w * 0.30, y: r.maxY),
                   control2: CGPoint(x: r.minX, y: r.minY + h * 0.88))
        p.addCurve(to: CGPoint(x: r.midX, y: r.minY),
                   control1: CGPoint(x: r.minX, y: r.minY + h * 0.30),
                   control2: CGPoint(x: r.midX - w * 0.42, y: r.minY))
        p.closeSubpath()
        return p
    }
}

/// Fixed-seed speckles, so the shell looks the same every launch.
private struct Speckle: View {
    var body: some View {
        Canvas { ctx, size in
            var seed: UInt64 = 42
            func next() -> Double {
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                return Double(seed >> 33) / 2147483648.0
            }
            for i in 0..<90 {
                let x = next() * size.width
                let y = next() * size.height
                let r = 1.0 + next() * 2.2
                let color = i % 3 == 0 ? Color.black.opacity(0.10) : Color.white.opacity(0.45)
                ctx.fill(Path(ellipseIn: CGRect(x: x, y: y, width: r, height: r)), with: .color(color))
            }
        }
        .allowsHitTesting(false)
    }
}

private struct PlasticButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        return configuration.label
            .background(
                Circle().fill(LinearGradient(
                    colors: [Color(red: 1.0, green: 0.96, blue: 0.80), Color(red: 0.96, green: 0.78, blue: 0.45)],
                    startPoint: .top, endPoint: .bottom))
            )
            .overlay(Circle().stroke(Color.white.opacity(0.6), lineWidth: 1.5))
            .shadow(color: .black.opacity(pressed ? 0.1 : 0.3), radius: pressed ? 1 : 4, y: pressed ? 1 : 3)
            .scaleEffect(pressed ? 0.94 : 1)
    }
}

@MainActor
enum Haptics {
    static func tap() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
