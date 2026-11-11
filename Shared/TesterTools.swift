import Foundation

/// Decides whether the tester switches (Preview Plus, egg chooser, new egg of any family) exist.
/// They are on in Debug builds and in TestFlight builds, and never in App Store production builds.
enum TesterTools {
    /// TestFlight installs carry a receipt named `sandboxReceipt`; App Store installs carry `receipt`.
    static func isTestFlight(receiptURL: URL? = Bundle.main.appStoreReceiptURL) -> Bool {
        receiptURL?.lastPathComponent == "sandboxReceipt"
    }

    static var isDebugBuild: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    /// True when the Testing section and the tester switches are active.
    static func isEnabled(debug: Bool = TesterTools.isDebugBuild,
                          receiptURL: URL? = Bundle.main.appStoreReceiptURL) -> Bool {
        debug || isTestFlight(receiptURL: receiptURL)
    }
}
