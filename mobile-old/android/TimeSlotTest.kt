package com.hnnp.device

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Unit tests for TimeSlot boundary behavior:
 *
 * - 14.9 seconds -> time_slot 0
 * - 15.0 seconds -> time_slot 1
 */
class TimeSlotTest {

    @Test
    fun `14_9 seconds is still slot 0`() {
        val slot = TimeSlot.compute(14.9)
        assertEquals(0L, slot)
    }

    @Test
    fun `15_0 seconds is slot 1`() {
        val slot = TimeSlot.compute(15.0)
        assertEquals(1L, slot)
    }
}

