import SwiftUI

// Technicolor sheet and dialog parts built from the pixel chrome (Shared/Chrome96.swift): section headings, toggle rows, the naming prompt.
// Traditional never uses these: it keeps the system Form and alert.

/// A section heading with a one-cell rule under it.
struct ChromeSectionHeader: View {
    let title: String
    @Environment(\.lcdPalette) private var palette
    @Environment(\.displayScale) private var displayScale

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ChromeText(title, ps: 4)
            Rectangle().fill(palette.ink).frame(height: ChromeDensity.technicolor.cellPixel(scale: displayScale))
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

/// A settings row: title and optional subtitle on the left, an ON / OFF pixel switch on the right. The whole row toggles.
struct ChromeToggleRow: View {
    let title: String
    var subtitle: String?
    @Binding var isOn: Bool
    let identifier: String
    /// Width available to the whole row.
    let width: CGFloat
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        let switchW: CGFloat = 64
        let textW = max(60, width - 24 - switchW - 10)
        Button { isOn.toggle() } label: {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    ChromeText(title, ps: 4.5)
                    if let subtitle { ChromeParagraph(text: subtitle, ps: 3, avail: textW, color: palette.ink.opacity(0.75)) }
                }
                .frame(width: textW, alignment: .leading)
                ChromeText(isOn ? "ON" : "OFF", ps: 3.5, color: isOn ? palette.background : palette.ink)
                    .frame(width: switchW, height: 40)
                    .chromeBox(isOn ? .down : .raised)
            }
            .padding(12)
            .frame(width: width, alignment: .leading)
            .chromeBox(.raised)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityValue(isOn ? "On" : "Off")
        .accessibilityAddTraits([.isButton, .isToggle])
        .accessibilityIdentifier(identifier)
    }
}

/// The naming prompt after hatching: a pixel dialog over a dimmed screen with the name typed into a pixel field.
struct ChromeNamePrompt: View {
    let title: String
    let keepName: String
    @Binding var name: String
    let onName: () -> Void
    let keep: () -> Void
    @FocusState private var focused: Bool
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        ZStack {
            Color.black.opacity(0.4).ignoresSafeArea()
            VStack(spacing: 14) {
                ChromeText(title, ps: 4.5)
                ChromeText("WHAT WILL YOU CALL IT?", ps: 3)
                ZStack {
                    ChromeText(name.isEmpty ? " " : String(name.prefix(14)) + "_", ps: 5)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .chromeBox(.inset)
                    TextField("Name", text: $name)
                        .focused($focused)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                        .opacity(0.02)
                        .frame(height: 44)
                        .accessibilityIdentifier("name-field")
                        .onChange(of: name) { _, v in if v.count > 14 { name = String(v.prefix(14)) } }
                }
                .onTapGesture { focused = true }
                ChromeButton(title: "NAME IT", ps: 4, fill: true, identifier: "name-it", action: onName)
                ChromeButton(title: "KEEP " + keepName, ps: 3, fill: true, identifier: "name-keep", action: keep)
            }
            .padding(18)
            .frame(maxWidth: 340)
            .chromeBox(.raised, radius: 5)
            .background(palette.background.opacity(0.001))
            .padding(.horizontal, 24)
            .offset(y: -60)
        }
        .onAppear { focused = true }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
    }
}
