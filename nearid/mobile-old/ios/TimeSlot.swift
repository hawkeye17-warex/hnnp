import Foundation

/// TimeSlot helper computes the discrete token rotation window for a given Unix time.
///
/// Spec (v2):
///   time_slot = floor(unix_time / 15)
///
/// The function operates on seconds since Unix epoch (TimeInterval).
enum TimeSlotHelper {
    private static let defaultWindowSeconds: TimeInterval = 15.0

    static func compute(unixTime: TimeInterval, windowSeconds: TimeInterval = defaultWindowSeconds) -> Int64 {
        precondition(windowSeconds > 0)
        return Int64(floor(unixTime / windowSeconds))
    }
}

