import Foundation

// Native 96x96 biome scenery for Technicolor (docs/RESOLUTION.md, stage 2): the shared dispatch, the drawing kit and the slot layers.
//
// The painters come from expo-prototype/src/ui/biome96/*.ts. Their STATIC art (the part cached per biome, phase and rain in Expo) is
// exported by tools/gen_biome96a.ts as run-length strings (Biome96AData.swift); the animated parts are ported by hand (Biome96A*.swift for
// meadow, woods, underwater, clouds, garden, yard and warren; Biome96B*.swift for the rest). `Biome96.backdrop` / `fore` return false for a
// biome without a native painter, and the scene then falls back to the 3/2 nearest enlargement of the 64 art (BiomeDraw.backdrop96).
//
// Slot layers: the Expo painters use layer codes 95...127 as per-biome "slots" (bark, kelp, window ...). Swift's SceneLayer already owns
// 95...97 for the egg shell, so a slot code here is the Expo code + 3: `SceneLayer.slotFirst` = 98 ... `slotLast` = 130. A slot means one thing
// per biome; ScenePalette asks `Biome96A.slotColors` for the hex table of the biome and phase being drawn.

// MARK: - run-length layers

/// Decodes the generated "<code hex>x<run>,..." strings (96x96 cells, row by row).
enum Layer96 {
    static let cells = 96 * 96

    static func decode(_ s: String) -> [UInt8] {
        var out = [UInt8](repeating: 0, count: cells)
        var pos = 0
        var value = 0, run = 0
        var inRun = false
        func flush() {
            if inRun && run > 0 && value != 0 {
                let end = min(cells, pos + run)
                if pos < end { for i in pos..<end { out[i] = UInt8(truncatingIfNeeded: value) } }
            }
            pos += run
            value = 0; run = 0; inRun = false
        }
        for ch in s.utf8 {
            switch ch {
            case 120: inRun = true                                  // "x"
            case 44: flush()                                         // ","
            case 48...57: if inRun { run = run * 10 + Int(ch - 48) } else { value = value * 16 + Int(ch - 48) }
            case 97...102: value = value * 16 + Int(ch - 87)         // a...f
            default: break
            }
        }
        flush()
        return out
    }

    /// FNV-1a over the cells (the golden hashes of the generator).
    static func hash(_ cells: [UInt8]) -> UInt32 {
        var h: UInt32 = 0x811c9dc5
        for v in cells { h ^= UInt32(v); h = h &* 0x01000193 }
        return h
    }
}

// MARK: - drawing kit (the pieces of expo-prototype/src/ui/biome96/kit.ts the live parts use)

extension SceneRaster {
    /// One cell by raw code (slot layers included), clipped.
    @inline(__always)
    mutating func put(_ x: Int, _ y: Int, _ code: UInt8) {
        if x >= 0 && x < n && y >= 0 && y < n { cells[y * n + x] = code }
    }

    /// Rounded like JS Math.round.
    mutating func putR(_ x: Double, _ y: Double, _ code: UInt8) {
        put(BiomeDraw.jsRound(x), BiomeDraw.jsRound(y), code)
    }

    mutating func hline(_ x0: Int, _ x1: Int, _ y: Int, _ code: UInt8) {
        if x1 < x0 { return }
        for x in x0...x1 { put(x, y, code) }
    }

    mutating func vline(_ x: Int, _ y0: Int, _ y1: Int, _ code: UInt8) {
        if y1 < y0 { return }
        for y in y0...y1 { put(x, y, code) }
    }

    mutating func fill(_ x: Int, _ y: Int, _ w: Int, _ h: Int, _ code: UInt8) {
        if w <= 0 || h <= 0 { return }
        for yy in y..<(y + h) { for xx in x..<(x + w) { put(xx, yy, code) } }
    }

    /// A filled ellipse (kit.ts `ell`).
    mutating func ell(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double, _ code: UInt8) {
        let y0 = Int((cy - ry).rounded(.down)), y1 = Int((cy + ry).rounded(.up))
        let x0 = Int((cx - rx).rounded(.down)), x1 = Int((cx + rx).rounded(.up))
        if y1 < y0 || x1 < x0 { return }
        for y in y0...y1 {
            for x in x0...x1 {
                let dx = (Double(x) - cx) / (rx + 0.3), dy = (Double(y) - cy) / (ry + 0.3)
                if dx * dx + dy * dy <= 1 { put(x, y, code) }
            }
        }
    }

    /// Copies the lit cells of a decoded layer over the raster (`onlyEmpty`: only into unlit cells).
    mutating func blit(_ layer: [UInt8], onlyEmpty: Bool = false) {
        if layer.count != cells.count { return }
        layer.withUnsafeBufferPointer { src in
            cells.withUnsafeMutableBufferPointer { dst in
                if onlyEmpty {
                    for i in 0..<src.count where src[i] != 0 && dst[i] == 0 { dst[i] = src[i] }
                } else {
                    for i in 0..<src.count where src[i] != 0 { dst[i] = src[i] }
                }
            }
        }
    }

    /// Where `back` has scenery in front, the sky's sun, moon, stars, clouds and butterfly are cleared (the sun sets behind the leaves).
    mutating func occlude(_ back: [UInt8]) {
        if back.count != cells.count { return }
        for i in 0..<back.count where back[i] != 0 {
            switch cells[i] {
            case SceneLayer.sun.rawValue, SceneLayer.moon.rawValue, SceneLayer.star.rawValue, SceneLayer.cloud.rawValue,
                 SceneLayer.butterfly.rawValue: cells[i] = back[i]
            default: break
            }
        }
    }
}

extension BiomeLive {
    /// A still picture (reduced motion): frame zero.
    var still: Bool { tick == 0 && seconds == 0 }
}

extension SceneRaster {
    /// A string-row sprite; each byte maps to a code through `legend`, anything else is skipped. `flip` mirrors it left to right.
    mutating func spr(_ rows: [String], _ x: Int, _ y: Int, _ legend: [UInt8: UInt8], flip: Bool = false) {
        for (j, row) in rows.enumerated() {
            let bytes = Array(row.utf8)
            let w = bytes.count
            for i in 0..<w {
                if let code = legend[flip ? bytes[w - 1 - i] : bytes[i]] { put(x + i, y + j, code) }
            }
        }
    }
}
