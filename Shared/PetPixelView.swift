import SwiftUI

/// Colors of the fake LCD.
enum LCDStyle {
    static let background = Color(red: 0xB5 / 255.0, green: 0xC1 / 255.0, blue: 0x9A / 255.0)
    static let ink = Color(red: 0x2B / 255.0, green: 0x33 / 255.0, blue: 0x20 / 255.0)
}

/// Builds the 32x32 pixel scene as paths, shared by the animated screen and the static view.
enum LCDPainter {
    static let grid = 32

    /// Faint "unlit" pixels, for the LCD look.
    static func gridPath(size: CGSize) -> Path {
        let cell = min(size.width, size.height) / CGFloat(grid)
        var path = Path()
        for y in 0..<grid {
            for x in 0..<grid {
                path.addRect(pixelRect(x, y, cell))
            }
        }
        return path
    }

    /// Every dark pixel of the pet and its status glyphs.
    static func inkPath(_ pet: Pet, size: CGSize, blink: Bool, bob: Bool, alertOn: Bool) -> Path {
        let cell = min(size.width, size.height) / CGFloat(grid)
        var path = Path()

        func glyph(_ rows: [String], _ x0: Int, _ y0: Int) {
            for (r, row) in rows.enumerated() {
                for (c, ch) in row.enumerated() where ch == "X" {
                    let x = x0 + c
                    let y = y0 + r
                    guard x >= 0, x < grid, y >= 0, y < grid else { continue }
                    path.addRect(pixelRect(x, y, cell))
                }
            }
        }

        if pet.stage == .ghost {
            glyph(Sprite.grave, 8, 11)
            return path
        }

        glyph(Sprite.sprite(for: pet, blink: blink || pet.asleep), 8, bob ? 12 : 11)
        guard pet.stage != .egg else { return path }

        for i in 0..<Pet.maxHearts {
            glyph(i < pet.hunger ? Sprite.heartFull : Sprite.heartEmpty, 1 + 6 * i, 0)
            glyph(i < pet.happy ? Sprite.smileFull : Sprite.smileEmpty, 1 + 6 * i, 6)
        }
        for i in 0..<min(pet.poops, 3) {
            glyph(Sprite.poop, 26 - 6 * i, 27)
        }
        if pet.sick { glyph(Sprite.skull, 1, 27) }
        if pet.asleep { glyph(Sprite.zzz, 26, 6) }
        if pet.temp >= 2 && !pet.asleep { glyph(Sprite.drop, 26, 12) }
        if pet.temp <= -2 && !pet.asleep { glyph(Sprite.flake, 26, 12) }
        if pet.needsAttention && alertOn { glyph(Sprite.alert, 26, 0) }
        return path
    }

    private static func pixelRect(_ x: Int, _ y: Int, _ cell: CGFloat) -> CGRect {
        let inset = cell * 0.06
        return CGRect(x: CGFloat(x) * cell + inset, y: CGFloat(y) * cell + inset,
                      width: cell - inset * 2, height: cell - inset * 2)
    }
}

/// A still picture of the pet on the LCD. Needs only a `Pet`, so widgets can use it.
struct PetPixelView: View {
    let pet: Pet

    init(pet: Pet) { self.pet = pet }

    var body: some View {
        Canvas { ctx, size in
            ctx.fill(LCDPainter.gridPath(size: size), with: .color(LCDStyle.ink.opacity(0.06)))
            ctx.fill(LCDPainter.inkPath(pet, size: size, blink: false, bob: false, alertOn: true),
                     with: .color(LCDStyle.ink))
        }
        .aspectRatio(1, contentMode: .fit)
        .background(LCDStyle.background)
        .overlay {
            if pet.asleep && !pet.lightOn { Color.black.opacity(0.5) }
        }
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
        .accessibilityLabel(pet.statusLine)
    }

    static func image(for pet: Pet, size: CGFloat) -> some View {
        PetPixelView(pet: pet).frame(width: size, height: size)
    }
}
