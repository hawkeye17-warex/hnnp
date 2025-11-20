import Foundation
import CoreBluetooth

/// HnnpBleBroadcaster coordinates token rotation and BLE advertising for HNNP v2.
///
/// Requirements from spec.md (v2):
/// - Rotate tokens every 15 seconds using time_slot.
/// - Broadcast current packet frequently in active mode (OS-level interval ~300–500 ms).
/// - In background mode, advertising can be slowed or disabled.
/// - BLE advertising interval is independent from token rotation.
///
/// This class uses a 1-second timer to track time_slot boundaries and updates
/// the advertising payload only when the slot changes. CoreBluetooth controls
/// the actual radio interval.
final class HnnpBleBroadcaster: NSObject, CBPeripheralManagerDelegate {

    enum Mode {
        case active
        case background
        case stopped
    }

    private let peripheralManager: CBPeripheralManager
    private var mode: Mode = .stopped
    private var timer: Timer?
    private var currentTimeSlot: Int64?

    override init() {
        self.peripheralManager = CBPeripheralManager(delegate: nil, queue: nil)
        super.init()
        self.peripheralManager.delegate = self
    }

    func startActive() {
        mode = .active
        startTimerIfNeeded()
    }

    func startBackground() {
        mode = .background
        startTimerIfNeeded()
    }

    func stop() {
        mode = .stopped
        stopAdvertising()
        stopTimer()
    }

    private func startTimerIfNeeded() {
        guard timer == nil else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func tick() {
        guard mode != .stopped else { return }
        guard peripheralManager.state == .poweredOn else { return }

        let now = Date().timeIntervalSince1970
        let slot = TimeSlotHelper.compute(unixTime: now)

        let previous = currentTimeSlot
        if previous == nil || previous != slot {
            currentTimeSlot = slot

            #if DEBUG
            // Debug-only logging for time_slot transitions; no secrets logged.
            NSLog("HnnpBleBroadcaster: time_slot changed from \(previous.map(String.init) ?? \"none\") to \(slot) (unixTime=\(now))")
            #endif

            // Immediately recompute token + MAC and restart advertising for the new slot.
            updateAdvertising(for: slot)
        }
    }

    private func updateAdvertising(for timeSlot: Int64) {
        do {
            let deviceSecret = try DeviceSecretManager.getOrCreateDeviceSecret()
            let deviceAuthKey = DeviceSecretManager.deriveDeviceAuthKey(from: deviceSecret)

            let presenceToken = try TokenGenerator.derivePresenceToken(deviceAuthKey: deviceAuthKey, timeSlot: timeSlot)

            let version: UInt8 = 0x02
            let flags: UInt8 = 0x00
            let ts32 = UInt32(clamping: timeSlot)

            let mac = try BlePacketBuilder.computeMac(
                deviceAuthKey: deviceAuthKey,
                version: version,
                flags: flags,
                timeSlot: ts32,
                tokenPrefix: presenceToken.tokenPrefix
            )

            let packet = try BlePacketBuilder.buildBlePacketV2(
                version: version,
                flags: flags,
                timeSlot: ts32,
                tokenPrefix: presenceToken.tokenPrefix,
                mac: mac
            )

            let advData = BleAdvertisingPayload.buildServiceData(from: packet)

            // Restart advertising with updated payload for this time_slot.
            peripheralManager.stopAdvertising()

            switch mode {
            case .active:
                peripheralManager.startAdvertising(advData)
            case .background:
                // In background mode, platform may already throttle advertising.
                // Optionally, we could stop advertising entirely to reduce power.
                peripheralManager.startAdvertising(advData)
            case .stopped:
                break
            }

        } catch {
            // Log only high-level error; never secrets.
            NSLog("HnnpBleBroadcaster: failed to update advertising for slot \(timeSlot): \(error.localizedDescription)")
        }
    }

    private func stopAdvertising() {
        peripheralManager.stopAdvertising()
    }

    // MARK: - CBPeripheralManagerDelegate

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        // When powered on, the next timer tick will begin advertising as needed.
        if peripheral.state != .poweredOn {
            stopAdvertising()
        }
    }
}
