import Foundation

/// Which animal families the player may start a new egg with. This is the only gate for Plus
/// (docs/PLUS.md): a pet that already exists keeps living, whatever the entitlement says.
/// No StoreKit yet; a `StoreKitEntitlements` conforming type comes with the purchase flow.
protocol Entitlements {
    /// True when the player has Plus.
    var isPlus: Bool { get }
    /// Whether a new egg of this family may be started.
    func canHatch(family id: String) -> Bool
}

/// The shipping default: only free families (today the dinos).
struct FreeEntitlements: Entitlements {
    var isPlus: Bool { false }
    func canHatch(family id: String) -> Bool { Species.family(id)?.isFree ?? false }
}

/// Everything unlocked, for testers and tests. Not a purchase; see `EntitlementStore`.
struct PreviewEntitlements: Entitlements {
    var isPlus: Bool { true }
    func canHatch(family id: String) -> Bool { Species.family(id) != nil }
}

/// Reads the tester switches from defaults and hands out the matching `Entitlements`.
/// Both switches only work in Debug and TestFlight builds (`TesterTools`); App Store builds
/// always answer "free, no chooser".
enum EntitlementStore {
    /// Settings toggle "Preview Plus (testing)": unlock every family.
    static let previewKey = "plusPreview"
    /// Settings toggle "Show egg chooser (testing)": show the Choose your egg screen even when
    /// only the free family is unlocked (so the locked tiles can be seen).
    static let chooserKey = "eggChooser"

    static func previewEnabled(defaults: UserDefaults? = nil, testerTools: Bool = TesterTools.isEnabled()) -> Bool {
        testerTools && (defaults ?? PetStore.defaults).bool(forKey: previewKey)
    }

    /// The Choose your egg screen is shown when Plus is previewed or the chooser switch is on.
    static func chooserEnabled(defaults: UserDefaults? = nil, testerTools: Bool = TesterTools.isEnabled()) -> Bool {
        guard testerTools else { return false }
        let store = defaults ?? PetStore.defaults
        return store.bool(forKey: previewKey) || store.bool(forKey: chooserKey)
    }

    static func current(defaults: UserDefaults? = nil, testerTools: Bool = TesterTools.isEnabled()) -> Entitlements {
        previewEnabled(defaults: defaults, testerTools: testerTools) ? PreviewEntitlements() : FreeEntitlements()
    }
}
