import XCTest

/// Tests for TimeSlotHelper boundary behavior:
/// - 14.9 seconds -> time_slot 0
/// - 15.0 seconds -> time_slot 1
final class TimeSlotTests: XCTestCase {

    func testBoundaryBeforeRotation() {
        let slot = TimeSlotHelper.compute(unixTime: 14.9)
        XCTAssertEqual(slot, 0)
    }

    func testBoundaryAtRotation() {
        let slot = TimeSlotHelper.compute(unixTime: 15.0)
        XCTAssertEqual(slot, 1)
    }
}

