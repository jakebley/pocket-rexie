import AVFoundation

/// Tiny square-wave beeps, built in memory as 8-bit WAV data. Muted by the "soundEnabled" setting.
final class Beeper {
    static let shared = Beeper()
    static let enabledKey = "soundEnabled"

    private var players: [AVAudioPlayer] = []
    private var sessionReady = false

    private var enabled: Bool {
        UserDefaults.standard.object(forKey: Beeper.enabledKey) as? Bool ?? true
    }

    /// Short blip for a button press.
    func blip() {
        play(notes: [(1320, 35)])
    }

    /// Little jingle for an attention call.
    func jingle() {
        play(notes: [(880, 90), (0, 30), (1175, 90), (0, 30), (1568, 160)])
    }

    private func play(notes: [(freq: Double, ms: Int)]) {
        guard enabled else { return }
        if !sessionReady {
            // Ambient respects the silent switch and mixes with other audio.
            try? AVAudioSession.sharedInstance().setCategory(.ambient)
            sessionReady = true
        }
        players.removeAll { !$0.isPlaying }
        guard let player = try? AVAudioPlayer(data: Beeper.wav(notes: notes)) else { return }
        player.volume = 0.6
        player.prepareToPlay()
        player.play()
        players.append(player)
    }

    /// Mono, 22.05 kHz, unsigned 8-bit PCM. A freq of 0 is a rest.
    private static func wav(notes: [(freq: Double, ms: Int)]) -> Data {
        let rate = 22050
        var samples: [UInt8] = []
        for note in notes {
            let count = rate * note.ms / 1000
            for i in 0..<count {
                if note.freq <= 0 {
                    samples.append(128)
                    continue
                }
                let phase = (Double(i) * note.freq / Double(rate)).truncatingRemainder(dividingBy: 1)
                // Short fade-out avoids a click at the end of each note.
                let fade = min(1.0, Double(count - i) / 200.0)
                let level = (phase < 0.5 ? 1.0 : -1.0) * 0.3 * 127.0 * fade
                samples.append(UInt8(128 + Int(level)))
            }
        }

        var data = Data()
        func text(_ s: String) { data.append(contentsOf: Array(s.utf8)) }
        func u32(_ v: Int) {
            data.append(contentsOf: [UInt8(v & 255), UInt8((v >> 8) & 255), UInt8((v >> 16) & 255), UInt8((v >> 24) & 255)])
        }
        func u16(_ v: Int) {
            data.append(contentsOf: [UInt8(v & 255), UInt8((v >> 8) & 255)])
        }
        text("RIFF"); u32(36 + samples.count); text("WAVE")
        text("fmt "); u32(16); u16(1); u16(1); u32(rate); u32(rate); u16(1); u16(8)
        text("data"); u32(samples.count)
        data.append(contentsOf: samples)
        return data
    }
}
