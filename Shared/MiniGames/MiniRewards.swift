import Foundation

/// Rank -> engine reward, plus the day cap (docs/PLAY.md). BRONZE counts as a win (smarts +3), SILVER or better adds a
/// happy heart, weight always burns a little, and only 3 plays per 24 hours of game time are rewarded: extra plays still
/// score but give nothing, and say so. The play log is `Pet.rewardedPlays` (seconds since 1970).
struct RewardResult: Equatable {
    var rank: Rank
    /// The engine was changed.
    var rewarded: Bool
    /// This play was over the day cap.
    var capped: Bool
    /// Effects for the result screen, e.g. ["SMARTS +3", "HAPPY +1"].
    var lines: [String]
    /// The one-line message for the message area.
    var msg: String
    /// Rewarded plays left today, after this one.
    var left: Int
}

enum MiniRewards {
    static let day: Double = 24 * 3600
    static let dailyRewardedPlays = 3

    /// The rewarded plays still inside the last 24 h of game time.
    static func recent(_ p: Pet, now: Double) -> [Double] {
        p.rewardedPlays.filter { now - $0 < day && $0 <= now + 1 }
    }

    static func left(_ p: Pet, now: Double) -> Int {
        max(0, dailyRewardedPlays - recent(p, now: now).count)
    }

    /// Apply a finished play to the pet (call after `advance`).
    static func apply(_ p: inout Pet, rank: Rank, now: Double) -> RewardResult {
        let recent = recent(p, now: now)
        p.rewardedPlays = recent
        if recent.count >= dailyRewardedPlays {
            return RewardResult(rank: rank, rewarded: false, capped: true, lines: ["DAY LIMIT", "NO REWARD"],
                                msg: "\(p.name) is worn out. No reward until tomorrow", left: 0)
        }
        let beforeSmarts = p.smarts, beforeHappy = p.happy
        let msg = p.finishRanked(rank)
        if msg == "..." {
            return RewardResult(rank: rank, rewarded: false, capped: false, lines: [], msg: "", left: dailyRewardedPlays - recent.count)
        }
        p.rewardedPlays = recent + [now]
        var lines: [String] = []
        if p.smarts > beforeSmarts { lines.append("SMARTS +\(p.smarts - beforeSmarts)") }
        if p.happy > beforeHappy { lines.append("HAPPY +\(p.happy - beforeHappy)") }
        if lines.isEmpty { lines.append(rank == .none ? "BURNED A LITTLE" : "ALL MAXED OUT") }
        return RewardResult(rank: rank, rewarded: true, capped: false, lines: lines, msg: msg,
                            left: dailyRewardedPlays - recent.count - 1)
    }
}
