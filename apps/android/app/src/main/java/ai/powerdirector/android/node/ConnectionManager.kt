package ai.powerdirector.android.node

import android.os.Build
import ai.powerdirector.android.BuildConfig
import ai.powerdirector.android.SecurePrefs
import ai.powerdirector.android.gateway.GatewayClientInfo
import ai.powerdirector.android.gateway.GatewayConnectOptions
import ai.powerdirector.android.gateway.GatewayEndpoint
import ai.powerdirector.android.gateway.GatewayTlsParams
import ai.powerdirector.android.protocol.PowerDirectorCanvasA2UICommand
import ai.powerdirector.android.protocol.PowerDirectorCanvasCommand
import ai.powerdirector.android.protocol.PowerDirectorCameraCommand
import ai.powerdirector.android.protocol.PowerDirectorLocationCommand
import ai.powerdirector.android.protocol.PowerDirectorScreenCommand
import ai.powerdirector.android.protocol.PowerDirectorSmsCommand
import ai.powerdirector.android.protocol.PowerDirectorCapability
import ai.powerdirector.android.LocationMode
import ai.powerdirector.android.VoiceWakeMode

class ConnectionManager(
  private val prefs: SecurePrefs,
  private val cameraEnabled: () -> Boolean,
  private val locationMode: () -> LocationMode,
  private val voiceWakeMode: () -> VoiceWakeMode,
  private val smsAvailable: () -> Boolean,
  private val hasRecordAudioPermission: () -> Boolean,
  private val manualTls: () -> Boolean,
) {
  companion object {
    internal fun resolveTlsParamsForEndpoint(
      endpoint: GatewayEndpoint,
      storedFingerprint: String?,
      manualTlsEnabled: Boolean,
    ): GatewayTlsParams? {
      val stableId = endpoint.stableId
      val stored = storedFingerprint?.trim().takeIf { !it.isNullOrEmpty() }
      val isManual = stableId.startsWith("manual|")

      if (isManual) {
        if (!manualTlsEnabled) return null
        if (!stored.isNullOrBlank()) {
          return GatewayTlsParams(
            required = true,
            expectedFingerprint = stored,
            allowTOFU = false,
            stableId = stableId,
          )
        }
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      // Prefer stored pins. Never let discovery-provided TXT override a stored fingerprint.
      if (!stored.isNullOrBlank()) {
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = stored,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      val hinted = endpoint.tlsEnabled || !endpoint.tlsFingerprintSha256.isNullOrBlank()
      if (hinted) {
        // TXT is unauthenticated. Do not treat the advertised fingerprint as authoritative.
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      return null
    }
  }

  fun buildInvokeCommands(): List<String> =
    buildList {
      add(PowerDirectorCanvasCommand.Present.rawValue)
      add(PowerDirectorCanvasCommand.Hide.rawValue)
      add(PowerDirectorCanvasCommand.Navigate.rawValue)
      add(PowerDirectorCanvasCommand.Eval.rawValue)
      add(PowerDirectorCanvasCommand.Snapshot.rawValue)
      add(PowerDirectorCanvasA2UICommand.Push.rawValue)
      add(PowerDirectorCanvasA2UICommand.PushJSONL.rawValue)
      add(PowerDirectorCanvasA2UICommand.Reset.rawValue)
      add(PowerDirectorScreenCommand.Record.rawValue)
      if (cameraEnabled()) {
        add(PowerDirectorCameraCommand.Snap.rawValue)
        add(PowerDirectorCameraCommand.Clip.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(PowerDirectorLocationCommand.Get.rawValue)
      }
      if (smsAvailable()) {
        add(PowerDirectorSmsCommand.Send.rawValue)
      }
      if (BuildConfig.DEBUG) {
        add("debug.logs")
        add("debug.ed25519")
      }
      add("app.update")
    }

  fun buildCapabilities(): List<String> =
    buildList {
      add(PowerDirectorCapability.Canvas.rawValue)
      add(PowerDirectorCapability.Screen.rawValue)
      if (cameraEnabled()) add(PowerDirectorCapability.Camera.rawValue)
      if (smsAvailable()) add(PowerDirectorCapability.Sms.rawValue)
      if (voiceWakeMode() != VoiceWakeMode.Off && hasRecordAudioPermission()) {
        add(PowerDirectorCapability.VoiceWake.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(PowerDirectorCapability.Location.rawValue)
      }
    }

  fun resolvedVersionName(): String {
    val versionName = BuildConfig.VERSION_NAME.trim().ifEmpty { "dev" }
    return if (BuildConfig.DEBUG && !versionName.contains("dev", ignoreCase = true)) {
      "$versionName-dev"
    } else {
      versionName
    }
  }

  fun resolveModelIdentifier(): String? {
    return listOfNotNull(Build.MANUFACTURER, Build.MODEL)
      .joinToString(" ")
      .trim()
      .ifEmpty { null }
  }

  fun buildUserAgent(): String {
    val version = resolvedVersionName()
    val release = Build.VERSION.RELEASE?.trim().orEmpty()
    val releaseLabel = if (release.isEmpty()) "unknown" else release
    return "PowerDirectorAndroid/$version (Android $releaseLabel; SDK ${Build.VERSION.SDK_INT})"
  }

  fun buildClientInfo(clientId: String, clientMode: String): GatewayClientInfo {
    return GatewayClientInfo(
      id = clientId,
      displayName = prefs.displayName.value,
      version = resolvedVersionName(),
      platform = "android",
      mode = clientMode,
      instanceId = prefs.instanceId.value,
      deviceFamily = "Android",
      modelIdentifier = resolveModelIdentifier(),
    )
  }

  fun buildNodeConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "node",
      scopes = emptyList(),
      caps = buildCapabilities(),
      commands = buildInvokeCommands(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "powerdirector-android", clientMode = "node"),
      userAgent = buildUserAgent(),
    )
  }

  fun buildOperatorConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "operator",
      scopes = listOf("operator.read", "operator.write", "operator.talk.secrets"),
      caps = emptyList(),
      commands = emptyList(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "powerdirector-control-ui", clientMode = "ui"),
      userAgent = buildUserAgent(),
    )
  }

  fun resolveTlsParams(endpoint: GatewayEndpoint): GatewayTlsParams? {
    val stored = prefs.loadGatewayTlsFingerprint(endpoint.stableId)
    return resolveTlsParamsForEndpoint(endpoint, storedFingerprint = stored, manualTlsEnabled = manualTls())
  }
}
