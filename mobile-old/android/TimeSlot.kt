package com.hnnp.device

import kotlin.math.floor

/**
 * TimeSlot computes the discrete token rotation window for a given Unix time.
 *
 * Spec (v2):
 *   time_slot = floor(unix_time / 15)
 *
 * This helper operates on seconds (Unix time). Callers using milliseconds must
 * convert to seconds first.
 */
object TimeSlot {

    private const val DEFAULT_WINDOW_SECONDS: Double = 15.0

    fun compute(unixTimeSeconds: Double, windowSeconds: Double = DEFAULT_WINDOW_SECONDS): Long {
        require(windowSeconds > 0.0) { "windowSeconds must be > 0" }
        return floor(unixTimeSeconds / windowSeconds).toLong()
    }
}

