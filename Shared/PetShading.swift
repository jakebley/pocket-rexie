import Foundation

// Procedural pet shading (native): turns a 1-bit silhouette (32x32 hi-res sprite) into layer codes with dimension:
// highlight, base, ordered-dithered shadow, deep underside, belly, accent tips on extremities, rim light and
// eye rings, plus opaque eyes. Port of expo-prototype/src/ui/shading.ts (the spec and the tested
// implementation); the arithmetic is kept identical (Float for distance maps, same traversal orders) so the
// output matches it code for code (Tests/ShadingTests.swift checks hashes taken from the Expo output).
//
// Invariant: the LIT PIXEL SET never changes: every lit pixel gets a non-zero code; unlit cells stay 0 except
// eye-hole fills (`eyeFill`, `eyeShine`: Technicolor-only codes that Traditional prints as unlit). Traditional
// prints every Traditional-visible code as ink, so it stays pixel-identical.

/// A shaded sprite: one layer code (`SceneLayer.rawValue`) per cell, row by row.
struct ShadedPet {
    let width: Int
    let height: Int
    let codes: [UInt8]

    func code(_ x: Int, _ y: Int) -> UInt8 {
        guard x >= 0, x < width, y >= 0, y < height else { return 0 }
        return codes[y * width + x]
    }
}

enum PetShading {
    // MARK: per-family rules

    struct Style {
        /// lighter underbelly / chest on the lower interior
        var belly: Bool
        /// small specular sheen near the top-left (jellies, bots, shells, spirits)
        var sheen: Bool
        /// accent for tips of protrusions that point up (ears, horns, crests, antennae); 0 = none
        var top: UInt8
        /// ... that point down (feet, paws, legs)
        var foot: UInt8
        /// ... that point sideways (tails, fins, arms, wings)
        var side: UInt8
    }

    private static let acc: UInt8 = SceneLayer.accent.rawValue
    private static let accDark: UInt8 = SceneLayer.accentDark.rawValue
    private static let accLight: UInt8 = SceneLayer.accentLight.rawValue

    static func style(family: String) -> Style {
        let a = acc, d = accDark, l = accLight
        switch family {
        case "dino": return Style(belly: true, sheen: false, top: a, foot: d, side: a)
        case "fox": return Style(belly: true, sheen: false, top: d, foot: d, side: l)
        case "fish": return Style(belly: true, sheen: true, top: a, foot: a, side: a)
        case "bird": return Style(belly: true, sheen: false, top: a, foot: a, side: d)
        case "cat": return Style(belly: true, sheen: false, top: d, foot: l, side: d)
        case "spirits": return Style(belly: false, sheen: true, top: l, foot: 0, side: l)
        case "bunny": return Style(belly: true, sheen: false, top: d, foot: l, side: l)
        case "dragon": return Style(belly: true, sheen: false, top: l, foot: d, side: a)
        case "bot": return Style(belly: false, sheen: true, top: a, foot: d, side: d)
        case "slime": return Style(belly: false, sheen: true, top: l, foot: 0, side: 0)
        case "bug": return Style(belly: false, sheen: true, top: d, foot: d, side: a)
        case "alien": return Style(belly: false, sheen: true, top: a, foot: d, side: l)
        default: return Style(belly: true, sheen: false, top: a, foot: d, side: a)
        }
    }

    /// How far down the silhouette an eye hole may sit; cats and bots carry spots and vents lower down.
    private static func eyeFrac(_ family: String) -> Double { (family == "cat" || family == "bot") ? 0.5 : 0.75 }
    /// Aliens have big eyes (up to three): the cell cap, the row tolerance and the count per frame grow for them.
    private static func eyeMaxCells(_ family: String, wide: Bool) -> Int { family == "alien" ? 64 : (wide ? 8 : 6) }
    private static func eyeRowTol(_ family: String) -> Double { family == "alien" ? 5.5 : 2.5 }
    private static func eyeRowMax(_ family: String) -> Int { family == "alien" ? 3 : 2 }

    /// Window offsets with squared distance below rm^2, nearest first (see the distance map in `shade`).
    private static func makeReach(_ rm: Int) -> (dx: [Int], dy: [Int], d2: [Int]) {
        var list: [(dx: Int, dy: Int, d2: Int)] = []
        for dy in -rm...rm {
            for dx in -rm...rm where dx * dx + dy * dy < rm * rm {
                list.append((dx: dx, dy: dy, d2: dx * dx + dy * dy))
            }
        }
        list.sort { $0.d2 < $1.d2 }
        return (dx: list.map { $0.dx }, dy: list.map { $0.dy }, d2: list.map { $0.d2 })
    }
    private static let reach7 = makeReach(7)
    /// 48x48 sprites: radius ceil(7 * 1.5) = 11.
    private static let reach11 = makeReach(11)
    /// Expo Math.round (half up) for the positive values used here.
    private static func jsRound(_ v: Double) -> Int { Int((v + 0.5).rounded(.down)) }
    private static let tHi = 0.42
    private static let tSh = 0.5
    private static let tDither = 0.28
    private static let vBias = 0.22

    // MARK: image helpers

    /// Flood the unlit cells connected to the grid edge (the outside), 4-connected.
    private static func exterior(_ on: [Bool], _ w: Int, _ h: Int) -> [Bool] {
        var ext = [Bool](repeating: false, count: w * h)
        var stack: [Int] = []
        func push(_ x: Int, _ y: Int) {
            let i = y * w + x
            if !on[i] && !ext[i] { ext[i] = true; stack.append(i) }
        }
        for x in 0..<w { push(x, 0); push(x, h - 1) }
        for y in 0..<h { push(0, y); push(w - 1, y) }
        while let i = stack.popLast() {
            let x = i % w, y = i / w
            if x > 0 { push(x - 1, y) }
            if x < w - 1 { push(x + 1, y) }
            if y > 0 { push(x, y - 1) }
            if y < h - 1 { push(x, y + 1) }
        }
        return ext
    }

    /// 4-connected components of the cells where `mask` is set. Cell order inside a component follows the
    /// same stack traversal as the Expo code (it decides which cell is "first" for the catch-light).
    private static func components(_ mask: [Bool], _ w: Int, _ h: Int) -> [[Int]] {
        var seen = [Bool](repeating: false, count: w * h)
        var list: [[Int]] = []
        for s in 0..<(w * h) {
            if !mask[s] || seen[s] { continue }
            var cells: [Int] = []
            var stack: [Int] = [s]
            seen[s] = true
            while let i = stack.popLast() {
                cells.append(i)
                let x = i % w, y = i / w
                // left, right, up, down: the same order the Expo code pushes them
                if x > 0 && mask[i - 1] && !seen[i - 1] { seen[i - 1] = true; stack.append(i - 1) }
                if x < w - 1 && mask[i + 1] && !seen[i + 1] { seen[i + 1] = true; stack.append(i + 1) }
                if y > 0 && mask[i - w] && !seen[i - w] { seen[i - w] = true; stack.append(i - w) }
                if y < h - 1 && mask[i + w] && !seen[i + w] { seen[i + w] = true; stack.append(i + w) }
            }
            list.append(cells)
        }
        return list
    }

    /// Binary erosion with a square window of radius r (outside the grid counts as unset).
    private static func erode(_ m: [Bool], _ w: Int, _ h: Int, _ r: Int) -> [Bool] {
        var o = [Bool](repeating: false, count: w * h)
        for y in 0..<h {
            for x in 0..<w {
                var all = true
                var dy = -r
                while dy <= r && all {
                    var dx = -r
                    while dx <= r {
                        let xx = x + dx, yy = y + dy
                        if xx < 0 || yy < 0 || xx >= w || yy >= h || !m[yy * w + xx] { all = false; break }
                        dx += 1
                    }
                    dy += 1
                }
                o[y * w + x] = all
            }
        }
        return o
    }

    private static func dilate(_ m: [Bool], _ w: Int, _ h: Int, _ r: Int) -> [Bool] {
        var o = [Bool](repeating: false, count: w * h)
        for y in 0..<h {
            for x in 0..<w where m[y * w + x] {
                for dy in -r...r {
                    for dx in -r...r {
                        let xx = x + dx, yy = y + dy
                        if xx >= 0 && yy >= 0 && xx < w && yy < h { o[yy * w + xx] = true }
                    }
                }
            }
        }
        return o
    }

    // MARK: the shader

    /// Shades one sprite (rows of "X" and "."). Light always comes from the top-left of the picture.
    static func shade(rows: [String], family: String) -> ShadedPet {
        let grid: [[UInt8]] = rows.map { Array($0.utf8) }
        let h = grid.count
        let w = grid.first?.count ?? 0
        let n = w * h
        var out = [UInt8](repeating: 0, count: n)
        if n == 0 { return ShadedPet(width: w, height: h, codes: out) }
        let st = style(family: family)
        // 32x32 sprites (Scale2x, Traditional and the 64 grid) or 48x48 ones (Scale3x of the 16x16 art, Technicolor at 96):
        // every pixel-unit constant is expressed for 32 and scaled by k (1 or 1.5), exactly like shading.ts.
        let k = Double(h) / 32.0
        let k2 = k * k
        let wide = k > 1

        let X: UInt8 = 88 // "X"
        var on = [Bool](repeating: false, count: n)
        var area = 0, ymin = h, ymax = -1
        for y in 0..<h {
            let row = grid[y]
            for x in 0..<w where x < row.count && row[x] == X {
                on[y * w + x] = true
                area += 1
                if y < ymin { ymin = y }
                if y > ymax { ymax = y }
            }
        }
        if area == 0 { return ShadedPet(width: w, height: h, codes: out) }

        func isOn(_ x: Int, _ y: Int) -> Bool { x >= 0 && y >= 0 && x < w && y < h && on[y * w + x] }
        var ol = [Bool](repeating: false, count: n)
        for y in 0..<h {
            for x in 0..<w where isOn(x, y) {
                if !(isOn(x - 1, y) && isOn(x + 1, y) && isOn(x, y - 1) && isOn(x, y + 1)) { ol[y * w + x] = true }
            }
        }
        func isOl(_ x: Int, _ y: Int) -> Bool { x >= 0 && y >= 0 && x < w && y < h && ol[y * w + x] }
        let ext = exterior(on, w, h)
        func isExt(_ x: Int, _ y: Int) -> Bool { x < 0 || y < 0 || x >= w || y >= h || ext[y * w + x] }

        // distance to the outside (holes count as body, so an eye does not carve its own bevel)
        var dist = [Float](repeating: 0, count: n)
        let rm = Int((7.0 * k).rounded(.up))
        // the exterior map padded by rMax cells of "outside" on every side, so the window scan needs no bounds checks
        let pw = w + 2 * rm
        var padded = [Bool](repeating: true, count: pw * (h + 2 * rm))
        for y in 0..<h {
            for x in 0..<w { padded[(y + rm) * pw + x + rm] = ext[y * w + x] }
        }
        // Nearest outside cell within the window: the offsets are tried nearest first (squared distance below
        // rMax^2), so the first hit is the minimum; no hit keeps the cap.
        let table = rm == 7 ? PetShading.reach7 : PetShading.reach11
        let reachDX = table.dx, reachDY = table.dy, reachD2 = table.d2
        let reachCount = reachD2.count
        padded.withUnsafeBufferPointer { pad in
            for y in 0..<h {
                for x in 0..<w {
                    if ext[y * w + x] { continue }
                    var best = rm * rm
                    let origin = (y + rm) * pw + x + rm
                    for k in 0..<reachCount where pad[origin + reachDY[k] * pw + reachDX[k]] {
                        best = reachD2[k]
                        break
                    }
                    dist[y * w + x] = Float(Double(best).squareRoot())
                }
            }
        }
        let a32 = Double(area) / k2
        let cap: Double = (a32 > 520 ? 3.6 : (a32 > 280 ? 3.1 : 2.6)) * k
        func at(_ x: Int, _ y: Int) -> Double { (x < 0 || y < 0 || x >= w || y >= h) ? 0 : Double(dist[y * w + x]) }
        var sm = [Float](repeating: 0, count: n)
        for y in 0..<h {
            for x in 0..<w {
                var sum: Double = 0
                for dy in -1...1 {
                    for dx in -1...1 { sum += at(x + dx, y + dy) }
                }
                sm[y * w + x] = Float(min(sum / 9, cap))
            }
        }
        func hh(_ x: Int, _ y: Int) -> Double { (x < 0 || y < 0 || x >= w || y >= h) ? 0 : Double(sm[y * w + x]) }

        let cBodyLight = SceneLayer.bodyLight.rawValue
        let cBody = SceneLayer.body.rawValue
        let cOutline = SceneLayer.outline.rawValue
        let cShade = SceneLayer.shade.rawValue
        let cDeep = SceneLayer.deep.rawValue
        let cBelly = SceneLayer.belly.rawValue
        let cRim = SceneLayer.rim.rawValue
        let cEye = SceneLayer.eye.rawValue
        let cGlint = SceneLayer.glint.rawValue
        let cFill = SceneLayer.eyeFill.rawValue
        let cShine = SceneLayer.eyeShine.rawValue

        // ---- base shading: light from the top-left ----
        let span = Double(max(1, ymax - ymin))
        for y in 0..<h {
            for x in 0..<w {
                let i = y * w + x
                if !on[i] { continue }
                if ol[i] {
                    out[i] = (isExt(x - 1, y) || isExt(x, y - 1)) ? cRim : cOutline
                    continue
                }
                let gx = (hh(x + 1, y) - hh(x - 1, y)) / 2
                let gy = (hh(x, y + 1) - hh(x, y - 1)) / 2
                let vn = (Double(y - ymin) / span) * 2 - 1
                let s = (gx + gy) * 0.7071 - vBias * vn
                if (isOl(x, y + 1) || (wide && isOl(x, y + 2) && ((x + y) & 1) == 0)) && vn > -0.1 {
                    out[i] = cDeep
                } else if s >= tHi {
                    out[i] = cBodyLight
                } else if s <= -tSh {
                    out[i] = cShade
                } else if s <= -tDither {
                    out[i] = ((x + y) & 1) == 0 ? cShade : cBody
                } else {
                    out[i] = cBody
                }
            }
        }

        // the torso: the silhouette opened by a 5x5 window (thin ears, legs, tails and necks fall away)
        var filled = [Bool](repeating: false, count: n)
        for i in 0..<n { filled[i] = on[i] || !ext[i] }
        let cr = wide ? 3 : 2
        let core = dilate(erode(filled, w, h, cr), w, h, cr)
        var cx: Double = 0, cy: Double = 0
        var cn = 0, cy0 = h, cy1 = -1
        for i in 0..<n where core[i] {
            let y = i / w
            cx += Double(i % w); cy += Double(y); cn += 1
            if y < cy0 { cy0 = y }
            if y > cy1 { cy1 = y }
        }

        // ---- belly: lighter lower interior of the torso (inset from the outline), softened by a dithered top edge ----
        if st.belly && cn > 0 {
            let line = Double(cy0) + Double(cy1 - cy0) * 0.56
            var belly = [Bool](repeating: false, count: n)
            for y in 0..<h {
                for x in 0..<w {
                    let i = y * w + x
                    if on[i] && !ol[i] && core[i] && Double(y) >= line && Double(dist[i]) >= 2.6 * k && out[i] != cDeep {
                        belly[i] = true
                    }
                }
            }
            for y in 0..<h {
                for x in 0..<w {
                    let i = y * w + x
                    if !belly[i] { continue }
                    let edge = y > 0 && !belly[i - w]
                    if edge && ((x + y) & 1) == 1 { continue }
                    out[i] = cBelly
                }
            }
        }

        // ---- sheen: a tiny L-shaped glint on the upper-left of the body ----
        if st.sheen && Double(area) >= 70 * k2 {
            var bx = -1, by = -1
            var bs: Double = 1e9
            for y in 0..<h {
                for x in 0..<w {
                    let i = y * w + x
                    if !on[i] || ol[i] || Double(dist[i]) < 2.4 * k { continue }
                    let sc = Double(x) + Double(y) * 1.15
                    if sc < bs { bs = sc; bx = x; by = y }
                }
            }
            if bx >= 0 {
                let offs: [(Int, Int)] = wide ? [(0, 0), (1, 0), (2, 0), (0, 1), (0, 2)] : [(0, 0), (1, 0), (0, 1)]
                for (dx, dy) in offs {
                    let x = bx + dx, y = by + dy
                    if isOn(x, y) && !isOl(x, y) { out[y * w + x] = cGlint }
                }
            }
        }

        // ---- accents on the tips of thin protrusions (ears, horns, crests, feet, tails) ----
        if (st.top != 0 || st.foot != 0 || st.side != 0) && cn > 0 {
            cx /= Double(cn); cy /= Double(cn)
            var prot = [Bool](repeating: false, count: n)
            for i in 0..<n { prot[i] = on[i] && !core[i] }
            // geodesic distance from the core through the protrusion
            var gd = [Int](repeating: 0, count: n)
            var frontier: [Int] = []
            for i in 0..<n where prot[i] {
                let x = i % w, y = i / w
                if (x > 0 && core[i - 1]) || (x < w - 1 && core[i + 1]) || (y > 0 && core[i - w]) || (y < h - 1 && core[i + w]) {
                    gd[i] = 1
                    frontier.append(i)
                }
            }
            while !frontier.isEmpty {
                var next: [Int] = []
                for i in frontier {
                    let x = i % w, y = i / w
                    if x > 0 && prot[i - 1] && gd[i - 1] == 0 { gd[i - 1] = gd[i] + 1; next.append(i - 1) }
                    if x < w - 1 && prot[i + 1] && gd[i + 1] == 0 { gd[i + 1] = gd[i] + 1; next.append(i + 1) }
                    if y > 0 && prot[i - w] && gd[i - w] == 0 { gd[i - w] = gd[i] + 1; next.append(i - w) }
                    if y < h - 1 && prot[i + w] && gd[i + w] == 0 { gd[i + w] = gd[i] + 1; next.append(i + w) }
                }
                frontier = next
            }
            for cells in components(prot, w, h) {
                if cells.count < jsRound(5 * k2) { continue }
                var m = 0
                for i in cells where gd[i] > m { m = gd[i] }
                if m < jsRound(3 * k) { continue }
                let thr = max(2, m - (jsRound(3 * k) - 1)) // the last three pixels: a sock, an ear tip, a tail tip
                var tx: Double = 0, ty: Double = 0
                var tn = 0
                for i in cells where gd[i] >= thr {
                    tx += Double(i % w); ty += Double(i / w); tn += 1
                }
                if tn == 0 { continue }
                let dx = tx / Double(tn) - cx
                let dy = ty / Double(tn) - cy
                let acc: UInt8
                if dy < -abs(dx) * 0.7 {
                    acc = st.top
                } else if dy > abs(dx) * 0.7 {
                    acc = st.foot
                } else {
                    acc = st.side
                }
                if acc == 0 { continue }
                for i in cells where gd[i] >= thr && !ol[i] { out[i] = acc }
            }
        }

        // ---- eyes: a small hole in the upper body gets a dark ring, an opaque pupil and a catch-light ----
        var hole = [Bool](repeating: false, count: n)
        for i in 0..<n { hole[i] = !on[i] && !ext[i] }
        // eyes are the small holes highest up (a cat's back spots or a bot's vents are lower and stay plain outline)
        var eyeCells: [[Int]] = []
        var eyeY: [Double] = []
        let maxCells = jsRound(Double(eyeMaxCells(family, wide: wide)) * k2)
        let frac = eyeFrac(family)
        for cells in components(hole, w, h) {
            if cells.isEmpty || cells.count > maxCells { continue }
            var sy = 0
            for i in cells { sy += i / w }
            let y = Double(sy) / Double(cells.count)
            if (y - Double(ymin)) / span <= frac {
                eyeCells.append(cells)
                eyeY.append(y)
            }
        }
        // the topmost row of holes is the eyes; three or more in that row is a pattern (spots, vents, windows) and stays open
        if !eyeCells.isEmpty {
            var top = eyeY[0]
            for y in eyeY where y < top { top = y }
            let tol = eyeRowTol(family) * k
            var row: [Int] = []
            for k in 0..<eyeCells.count where eyeY[k] <= top + tol { row.append(k) }
            if !row.isEmpty && row.count <= eyeRowMax(family) {
                for k in row {
                    let cells = eyeCells[k]
                    var gx = w, gy = h
                    for i in cells {
                        let x = i % w, y = i / w
                        if x < gx { gx = x }
                        if y < gy { gy = y }
                        let nb: [(Int, Int)] = [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
                        for (ax, ay) in nb where isOl(ax, ay) { out[ay * w + ax] = cEye }
                    }
                    // fill the see-through hole: dark pupil, one bright catch-light at its upper-left
                    var gi = cells[0]
                    for i in cells {
                        out[i] = cFill
                        if (i % w) + (i / w) < (gi % w) + (gi / w) { gi = i }
                    }
                    if cells.count >= 2 { out[gi] = cShine }
                    // a big eye gets a second sparkle beside the first (the alien glow)
                    if cells.count >= jsRound(10 * k2) {
                        for j in [gi + 1, gi + w] {
                            if j < n && out[j] == cFill {
                                out[j] = cShine
                                break
                            } else if isOn(gx - 1, gy - 1) && !isOl(gx - 1, gy - 1) {
                                out[(gy - 1) * w + gx - 1] = cGlint
                            }
                        }
                    }
                }
            }
        }
        return ShadedPet(width: w, height: h, codes: out)
    }

    // MARK: cache

    private struct Key: Hashable {
        let family: String
        let rows: [String]
    }
    private static let lock = NSLock()
    private static var cache: [Key: ShadedPet] = [:]

    /// Shaded layers for a sprite, cached per (family, sprite rows). A mirrored sprite is a different set of
    /// rows (the light always comes from the top-left of the screen, so it is shaded again).
    static func layers(rows: [String], family: String) -> ShadedPet {
        let key = Key(family: family, rows: rows)
        lock.lock()
        if let hit = cache[key] {
            lock.unlock()
            return hit
        }
        lock.unlock()
        let made = shade(rows: rows, family: family)
        lock.lock()
        cache[key] = made
        lock.unlock()
        return made
    }

    // The scene asks for the same few sprites (the species' frames, mirrored or not) on every render. Hashing 32 row
    // Strings per lookup is costly, so the hot path is keyed by the address of the row buffer instead. The entry
    // holds the rows (the buffer stays alive, so the address is not reused while cached) and a hit is confirmed
    // with `==`, which is O(1) for the same buffer. A miss falls back to the content cache above.
    private struct FastKey: Hashable {
        let base: Int
        let count: Int
        let mirror: Bool
        let family: String
    }
    private static let fastLock = NSLock()
    private static var fastCache: [FastKey: (rows: [String], shaded: ShadedPet)] = [:]

    /// `layers(rows:family:)` of the sprite as drawn: `rows` reversed left to right when `mirror` is set.
    static func layers(rows: [String], mirror: Bool, family: String) -> ShadedPet {
        guard !rows.isEmpty else { return layers(rows: rows, family: family) }
        let base = rows.withUnsafeBufferPointer { Int(bitPattern: $0.baseAddress) }
        let key = FastKey(base: base, count: rows.count, mirror: mirror, family: family)
        fastLock.lock()
        let hit = fastCache[key]
        fastLock.unlock()
        if let hit, hit.rows == rows { return hit.shaded }
        let shown = mirror ? rows.map { String($0.reversed()) } : rows
        let made = layers(rows: shown, family: family)
        fastLock.lock()
        if fastCache.count >= 4096 { fastCache.removeAll() }
        fastCache[key] = (rows: rows, shaded: made)
        fastLock.unlock()
        return made
    }

    /// Number of cached shaded frames (tests).
    static var cacheCount: Int {
        lock.lock()
        defer { lock.unlock() }
        return cache.count
    }
}
