import Foundation
import WatchConnectivity

extension Notification.Name {
    /// Posted on the main queue after a pet from the other device was merged into PetStore.
    static let petSynced = Notification.Name("petSynced")
}

/// Phone <-> watch sync over WatchConnectivity. The two sides may not share an App Group,
/// so each keeps its own PetStore and this reconciles them ("newer `modified` wins").
enum PetSync {
    fileprivate static let key = "pet"

    static func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        if session.delegate == nil || !(session.delegate is PetSyncDelegate) {
            session.delegate = PetSyncDelegate.shared
        }
        if session.activationState != .activated { session.activate() }
    }

    static func push(_ pet: Pet) {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        #if os(iOS)
        guard session.isPaired, session.isWatchAppInstalled else { return }
        #endif
        guard let data = try? JSONEncoder().encode(pet) else { return }
        let payload: [String: Any] = [key: data]
        try? session.updateApplicationContext(payload)
        if session.isReachable {
            session.sendMessage(payload, replyHandler: nil, errorHandler: { _ in })
        }
    }

    /// Merge a received pet into the local store. Returns true if the incoming pet won.
    fileprivate static func receive(_ payload: [String: Any]) {
        guard let data = payload[key] as? Data,
              let incoming = try? JSONDecoder().decode(Pet.self, from: data) else { return }
        var accept = true
        if PetStore.exists() {
            let local = PetStore.load()
            if incoming.generation != local.generation {
                accept = incoming.generation > local.generation
            } else {
                accept = incoming.modified > local.modified
            }
        }
        guard accept else { return }
        PetStore.save(incoming)
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: .petSynced, object: nil)
        }
    }
}

private final class PetSyncDelegate: NSObject, WCSessionDelegate {
    static let shared = PetSyncDelegate()
    private let queue = DispatchQueue(label: "PetSync.merge")

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        guard activationState == .activated else { return }
        let ctx = session.receivedApplicationContext
        if !ctx.isEmpty { queue.async { PetSync.receive(ctx) } }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        queue.async { PetSync.receive(applicationContext) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        queue.async { PetSync.receive(message) }
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
    #endif
}
