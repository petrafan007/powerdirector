package ai.powerdirector.app.node

import ai.powerdirector.app.protocol.PowerDirectorCalendarCommand
import ai.powerdirector.app.protocol.PowerDirectorCanvasA2UICommand
import ai.powerdirector.app.protocol.PowerDirectorCanvasCommand
import ai.powerdirector.app.protocol.PowerDirectorCameraCommand
import ai.powerdirector.app.protocol.PowerDirectorCapability
import ai.powerdirector.app.protocol.PowerDirectorCallLogCommand
import ai.powerdirector.app.protocol.PowerDirectorContactsCommand
import ai.powerdirector.app.protocol.PowerDirectorDeviceCommand
import ai.powerdirector.app.protocol.PowerDirectorLocationCommand
import ai.powerdirector.app.protocol.PowerDirectorMotionCommand
import ai.powerdirector.app.protocol.PowerDirectorNotificationsCommand
import ai.powerdirector.app.protocol.PowerDirectorPhotosCommand
import ai.powerdirector.app.protocol.PowerDirectorSmsCommand
import ai.powerdirector.app.protocol.PowerDirectorSystemCommand

data class NodeRuntimeFlags(
  val cameraEnabled: Boolean,
  val locationEnabled: Boolean,
  val sendSmsAvailable: Boolean,
  val readSmsAvailable: Boolean,
  val voiceWakeEnabled: Boolean,
  val motionActivityAvailable: Boolean,
  val motionPedometerAvailable: Boolean,
  val debugBuild: Boolean,
)

enum class InvokeCommandAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SendSmsAvailable,
  ReadSmsAvailable,
  MotionActivityAvailable,
  MotionPedometerAvailable,
  DebugBuild,
}

enum class NodeCapabilityAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SmsAvailable,
  VoiceWakeEnabled,
  MotionAvailable,
}

data class NodeCapabilitySpec(
  val name: String,
  val availability: NodeCapabilityAvailability = NodeCapabilityAvailability.Always,
)

data class InvokeCommandSpec(
  val name: String,
  val requiresForeground: Boolean = false,
  val availability: InvokeCommandAvailability = InvokeCommandAvailability.Always,
)

object InvokeCommandRegistry {
  val capabilityManifest: List<NodeCapabilitySpec> =
    listOf(
      NodeCapabilitySpec(name = PowerDirectorCapability.Canvas.rawValue),
      NodeCapabilitySpec(name = PowerDirectorCapability.Device.rawValue),
      NodeCapabilitySpec(name = PowerDirectorCapability.Notifications.rawValue),
      NodeCapabilitySpec(name = PowerDirectorCapability.System.rawValue),
      NodeCapabilitySpec(
        name = PowerDirectorCapability.Camera.rawValue,
        availability = NodeCapabilityAvailability.CameraEnabled,
      ),
      NodeCapabilitySpec(
        name = PowerDirectorCapability.Sms.rawValue,
        availability = NodeCapabilityAvailability.SmsAvailable,
      ),
      NodeCapabilitySpec(
        name = PowerDirectorCapability.VoiceWake.rawValue,
        availability = NodeCapabilityAvailability.VoiceWakeEnabled,
      ),
      NodeCapabilitySpec(
        name = PowerDirectorCapability.Location.rawValue,
        availability = NodeCapabilityAvailability.LocationEnabled,
      ),
      NodeCapabilitySpec(name = PowerDirectorCapability.Photos.rawValue),
      NodeCapabilitySpec(name = PowerDirectorCapability.Contacts.rawValue),
      NodeCapabilitySpec(name = PowerDirectorCapability.Calendar.rawValue),
      NodeCapabilitySpec(
        name = PowerDirectorCapability.Motion.rawValue,
        availability = NodeCapabilityAvailability.MotionAvailable,
      ),
      NodeCapabilitySpec(name = PowerDirectorCapability.CallLog.rawValue),
    )

  val all: List<InvokeCommandSpec> =
    listOf(
      InvokeCommandSpec(
        name = PowerDirectorCanvasCommand.Present.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCanvasCommand.Hide.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCanvasCommand.Navigate.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCanvasCommand.Eval.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCanvasCommand.Snapshot.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCanvasA2UICommand.Push.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCanvasA2UICommand.PushJSONL.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCanvasA2UICommand.Reset.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = PowerDirectorSystemCommand.Notify.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCameraCommand.List.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCameraCommand.Snap.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCameraCommand.Clip.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = PowerDirectorLocationCommand.Get.rawValue,
        availability = InvokeCommandAvailability.LocationEnabled,
      ),
      InvokeCommandSpec(
        name = PowerDirectorDeviceCommand.Status.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorDeviceCommand.Info.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorDeviceCommand.Permissions.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorDeviceCommand.Health.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorNotificationsCommand.List.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorNotificationsCommand.Actions.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorPhotosCommand.Latest.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorContactsCommand.Search.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorContactsCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCalendarCommand.Events.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCalendarCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = PowerDirectorMotionCommand.Activity.rawValue,
        availability = InvokeCommandAvailability.MotionActivityAvailable,
      ),
      InvokeCommandSpec(
        name = PowerDirectorMotionCommand.Pedometer.rawValue,
        availability = InvokeCommandAvailability.MotionPedometerAvailable,
      ),
      InvokeCommandSpec(
        name = PowerDirectorSmsCommand.Send.rawValue,
        availability = InvokeCommandAvailability.SendSmsAvailable,
      ),
      InvokeCommandSpec(
        name = PowerDirectorSmsCommand.Search.rawValue,
        availability = InvokeCommandAvailability.ReadSmsAvailable,
      ),
      InvokeCommandSpec(
        name = PowerDirectorCallLogCommand.Search.rawValue,
      ),
      InvokeCommandSpec(
        name = "debug.logs",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
      InvokeCommandSpec(
        name = "debug.ed25519",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
    )

  private val byNameInternal: Map<String, InvokeCommandSpec> = all.associateBy { it.name }

  fun find(command: String): InvokeCommandSpec? = byNameInternal[command]

  fun advertisedCapabilities(flags: NodeRuntimeFlags): List<String> {
    return capabilityManifest
      .filter { spec ->
        when (spec.availability) {
          NodeCapabilityAvailability.Always -> true
          NodeCapabilityAvailability.CameraEnabled -> flags.cameraEnabled
          NodeCapabilityAvailability.LocationEnabled -> flags.locationEnabled
          NodeCapabilityAvailability.SmsAvailable -> flags.sendSmsAvailable || flags.readSmsAvailable
          NodeCapabilityAvailability.VoiceWakeEnabled -> flags.voiceWakeEnabled
          NodeCapabilityAvailability.MotionAvailable -> flags.motionActivityAvailable || flags.motionPedometerAvailable
        }
      }
      .map { it.name }
  }

  fun advertisedCommands(flags: NodeRuntimeFlags): List<String> {
    return all
      .filter { spec ->
        when (spec.availability) {
          InvokeCommandAvailability.Always -> true
          InvokeCommandAvailability.CameraEnabled -> flags.cameraEnabled
          InvokeCommandAvailability.LocationEnabled -> flags.locationEnabled
          InvokeCommandAvailability.SendSmsAvailable -> flags.sendSmsAvailable
          InvokeCommandAvailability.ReadSmsAvailable -> flags.readSmsAvailable
          InvokeCommandAvailability.MotionActivityAvailable -> flags.motionActivityAvailable
          InvokeCommandAvailability.MotionPedometerAvailable -> flags.motionPedometerAvailable
          InvokeCommandAvailability.DebugBuild -> flags.debugBuild
        }
      }
      .map { it.name }
  }
}
