import Foundation

extension Array {
    /// Every n-th element, starting with the first. Used to keep whole-roster simulator tests fast:
    /// the roster is ordered by family, so a stride still touches every family.
    func sampled(every n: Int) -> [Element] {
        guard n > 1 else { return self }
        return enumerated().filter { $0.offset % n == 0 }.map { $0.element }
    }
}
