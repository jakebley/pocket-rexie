import Foundation
import UserNotifications

/// Local notifications for the pet: only the next call is scheduled (plus the hatch), so at most
/// one or two fire per day. The wording is curious rather than guilt-inducing. Nothing is
/// scheduled during the pet's sleep hours or while vacation mode is on.
enum Notifier {
    static let enabledKey = "notificationsEnabled"
    private static let askedKey = "askedNotificationPermission"
    private static let ids = ["rexie.call", "rexie.soon", "rexie.hatch"]

    /// UI tests: no permission prompt, nothing scheduled.
    nonisolated(unsafe) static var disabled = false

    static var enabled: Bool {
        if disabled { return false }
        return UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true
    }

    /// Ask once, right after the first hatch (never at launch).
    static func requestAuthorizationIfNeeded() {
        guard !disabled else { return }
        let defaults = UserDefaults.standard
        guard !defaults.bool(forKey: askedKey) else { return }
        defaults.set(true, forKey: askedKey)
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    static func reschedule(_ pet: Pet) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ids)
        guard enabled, pet.isAlive, !pet.paused else { return }

        if pet.stage == .egg {
            let hatch = pet.birth.addingTimeInterval(10 * 60)
            if hatch > Date() {
                add(id: "rexie.hatch", title: "Something is hatching!", body: "Come and say hello.", at: hatch)
            }
            return
        }

        guard let next = pet.nextCall(within: 48) else { return }
        let when = next.0
        add(id: "rexie.call", title: pet.name, body: copy(for: next.1, name: pet.name), at: when)
    }

    private static func copy(for call: Call, name: String) -> String {
        switch call {
        case .hungry: return "\(name) is wondering what is for lunch."
        case .bored: return "\(name) found a shiny rock and wants to show you."
        case .poop: return "\(name) left you a little surprise."
        case .sick: return "\(name) is a bit under the weather."
        case .naughty: return "\(name) is up to something."
        case .hot: return "\(name) could use some cool air."
        case .cold: return "\(name) is looking for a warm blanket."
        case .light: return "\(name) would like the light off."
        }
    }

    private static func add(id: String, title: String, body: String, at date: Date) {
        let interval = date.timeIntervalSinceNow
        guard interval > 1 else { return }
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }
}
