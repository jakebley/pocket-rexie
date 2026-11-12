import CoreGraphics

/// Where the square pixel scene sits on a taller, full-screen canvas (the watch). The cell is a whole number of
/// device pixels so the pixels stay crisp; the area around the scene is filled by the screen with sky and soil.
struct SceneFit: Equatable {
    /// Top-left corner of the scene, in points (device-pixel aligned).
    let origin: CGPoint
    /// One scene cell in points (a whole number of device pixels).
    let cell: CGFloat
    let grid: Int

    var side: CGFloat { cell * CGFloat(grid) }

    /// `topInset` is kept free for the system clock: the scene starts at or below it when the screen is tall enough.
    init(size: CGSize, scale: CGFloat, topInset: CGFloat = 0, grid: Int = SceneRaster.side) {
        let s = max(scale, 1)
        let px = max(1, (min(size.width, size.height) * s / CGFloat(grid)).rounded(.down))
        cell = px / s
        self.grid = grid
        let side = cell * CGFloat(grid)
        let x = ((size.width - side) / 2 * s).rounded(.down) / s
        let room = max(0, size.height - side)
        let want = (topInset / cell).rounded(.up) * cell
        let y = (min(want, room) * s).rounded(.down) / s
        origin = CGPoint(x: x, y: y)
    }

    /// A point of the screen in scene cells, clamped into the scene so a tap beside it lands on the nearest edge cell.
    func cellPoint(_ p: CGPoint) -> CGPoint {
        let g = CGFloat(grid)
        let x = min(max((p.x - origin.x) / cell, 0), g - 0.001)
        let y = min(max((p.y - origin.y) / cell, 0), g - 0.001)
        return CGPoint(x: x, y: y)
    }
}
