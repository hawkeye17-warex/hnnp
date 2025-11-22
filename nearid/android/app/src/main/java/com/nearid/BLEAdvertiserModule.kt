package com.nearid

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class BLEAdvertiserModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BLEAdvertiserModule"

    @ReactMethod
    fun startAdvertising(payload: ReadableArray) {
        val bytes = ByteArray(payload.size()) {
            payload.getInt(it).toByte()
        }
        BLEAdvertiserManager.startAdvertising(bytes)
    }

    @ReactMethod
    fun stopAdvertising() {
        BLEAdvertiserManager.stopAdvertising()
    }
}