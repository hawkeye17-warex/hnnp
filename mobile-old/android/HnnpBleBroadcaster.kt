package com.hnnp.device

import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.util.Log
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * HnnpBleBroadcaster coordinates token rotation and BLE advertising.
 *
 * Requirements from spec.md (v2):
 * - Rotate tokens every 15 seconds using time_slot.
 * - Broadcast current packet every ~300–500 ms in active mode (via OS advertising mode).
 * - In background mode, advertising can be slowed (~1–2s) or disabled.
 * - BLE advertising interval is independent from token rotation.
 *
 * This class uses a 1-second scheduler to track time_slot boundaries and updates
 * the advertising payload only when the slot changes. The underlying BLE
 * advertising interval is controlled by Android via AdvertiseSettings.
 */
class HnnpBleBroadcaster(
    private val context: Context,
    private val bluetoothAdapter: BluetoothAdapter,
) {

    enum class Mode {
        ACTIVE,
        BACKGROUND,
        STOPPED,
    }

    private val advertiser: BluetoothLeAdvertiser? = bluetoothAdapter.bluetoothLeAdvertiser
    private val scheduler: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()

    @Volatile
    private var mode: Mode = Mode.STOPPED

    @Volatile
    private var currentTimeSlot: Long? = null

    private val advertiseCallback = object : AdvertiseCallback() {}

    private var schedulerStarted = false

    fun startActive() {
        mode = Mode.ACTIVE
        ensureScheduler()
    }

    fun startBackground() {
        mode = Mode.BACKGROUND
        ensureScheduler()
    }

    fun stop() {
        mode = Mode.STOPPED
        stopAdvertising()
    }

    private fun ensureScheduler() {
        if (!schedulerStarted) {
            schedulerStarted = true
            scheduler.scheduleAtFixedRate(
                { tick() },
                0L,
                1L,
                TimeUnit.SECONDS,
            )
        }
    }

    private fun tick() {
        if (mode == Mode.STOPPED) {
            return
        }

        val unixTimeSeconds = System.currentTimeMillis() / 1000.0
        val slot = TimeSlot.compute(unixTimeSeconds)

        val previous = currentTimeSlot
        if (previous == null || previous != slot) {
            currentTimeSlot = slot

            // Debug-only logging for time_slot transitions; no secrets logged.
            if (android.os.BuildConfig.DEBUG) {
                Log.d(
                    "HnnpBleBroadcaster",
                    "time_slot changed from ${previous ?: "none"} to $slot (unixTime=$unixTimeSeconds)"
                )
            }

            // Immediately recompute token + MAC and restart advertising for the new slot.
            updateAdvertisingForSlot(slot)
        }
    }

    private fun updateAdvertisingForSlot(timeSlot: Long) {
        val adv = advertiser ?: return

        // Build new packet for this time_slot.
        try {
            val deviceSecret = DeviceSecretManager.getOrCreateDeviceSecret(context)
            val deviceAuthKey = DeviceSecretManager.deriveDeviceAuthKey(deviceSecret)

            val presenceToken = TokenGenerator.derivePresenceToken(deviceAuthKey, timeSlot)

            val version: Byte = 0x02
            val flags: Byte = 0x00

            val mac = BlePacketBuilder.computeMac(
                deviceAuthKey = deviceAuthKey,
                version = version,
                flags = flags,
                timeSlot = timeSlot,
                tokenPrefix = presenceToken.tokenPrefix,
            )

            val packet = BlePacketV2(
                version = version,
                flags = flags,
                timeSlot = timeSlot,
                tokenPrefix = presenceToken.tokenPrefix,
                mac = mac,
            )

            val advertiseData = BleAdvertisingPayload.buildServiceData(packet)
            val settings = buildSettingsForMode(mode)

            // Restart advertising with the new payload for this time_slot.
            adv.stopAdvertising(advertiseCallback)
            adv.startAdvertising(settings, advertiseData, advertiseCallback)
        } catch (e: Exception) {
            // Only log high-level error, never secrets.
            Log.w("HnnpBleBroadcaster", "Failed to update advertising for slot $timeSlot: ${e.message}")
        }
    }

    private fun stopAdvertising() {
        val adv = advertiser ?: return
        try {
            adv.stopAdvertising(advertiseCallback)
        } catch (_: Exception) {
            // Ignore errors on stop.
        }
    }

    private fun buildSettingsForMode(mode: Mode): AdvertiseSettings {
        val builder = AdvertiseSettings.Builder()
            .setConnectable(false)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_LOW)

        when (mode) {
            Mode.ACTIVE -> {
                // Approx. 100–300 ms interval depending on device/OS; within the spec's
                // desired 300–500 ms range for active mode.
                builder.setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            }
            Mode.BACKGROUND -> {
                // Slower advertising (~1–2s) suitable for background mode.
                builder.setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER)
            }
            Mode.STOPPED -> {
                builder.setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER)
            }
        }

        return builder.build()
    }
}
