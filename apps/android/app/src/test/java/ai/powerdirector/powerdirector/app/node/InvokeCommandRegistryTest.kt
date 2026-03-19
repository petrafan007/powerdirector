package ai.powerdirector.app.node

import ai.powerdirector.app.protocol.PowerDirectorCalendarCommand
import ai.powerdirector.app.protocol.PowerDirectorCameraCommand
import ai.powerdirector.app.protocol.PowerDirectorCallLogCommand
import ai.powerdirector.app.protocol.PowerDirectorCapability
import ai.powerdirector.app.protocol.PowerDirectorContactsCommand
import ai.powerdirector.app.protocol.PowerDirectorDeviceCommand
import ai.powerdirector.app.protocol.PowerDirectorLocationCommand
import ai.powerdirector.app.protocol.PowerDirectorMotionCommand
import ai.powerdirector.app.protocol.PowerDirectorNotificationsCommand
import ai.powerdirector.app.protocol.PowerDirectorPhotosCommand
import ai.powerdirector.app.protocol.PowerDirectorSmsCommand
import ai.powerdirector.app.protocol.PowerDirectorSystemCommand
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      PowerDirectorCapability.Canvas.rawValue,
      PowerDirectorCapability.Device.rawValue,
      PowerDirectorCapability.Notifications.rawValue,
      PowerDirectorCapability.System.rawValue,
      PowerDirectorCapability.Photos.rawValue,
      PowerDirectorCapability.Contacts.rawValue,
      PowerDirectorCapability.Calendar.rawValue,
      PowerDirectorCapability.CallLog.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      PowerDirectorCapability.Camera.rawValue,
      PowerDirectorCapability.Location.rawValue,
      PowerDirectorCapability.Sms.rawValue,
      PowerDirectorCapability.VoiceWake.rawValue,
      PowerDirectorCapability.Motion.rawValue,
    )

  private val coreCommands =
    setOf(
      PowerDirectorDeviceCommand.Status.rawValue,
      PowerDirectorDeviceCommand.Info.rawValue,
      PowerDirectorDeviceCommand.Permissions.rawValue,
      PowerDirectorDeviceCommand.Health.rawValue,
      PowerDirectorNotificationsCommand.List.rawValue,
      PowerDirectorNotificationsCommand.Actions.rawValue,
      PowerDirectorSystemCommand.Notify.rawValue,
      PowerDirectorPhotosCommand.Latest.rawValue,
      PowerDirectorContactsCommand.Search.rawValue,
      PowerDirectorContactsCommand.Add.rawValue,
      PowerDirectorCalendarCommand.Events.rawValue,
      PowerDirectorCalendarCommand.Add.rawValue,
      PowerDirectorCallLogCommand.Search.rawValue,
    )

  private val optionalCommands =
    setOf(
      PowerDirectorCameraCommand.Snap.rawValue,
      PowerDirectorCameraCommand.Clip.rawValue,
      PowerDirectorCameraCommand.List.rawValue,
      PowerDirectorLocationCommand.Get.rawValue,
      PowerDirectorMotionCommand.Activity.rawValue,
      PowerDirectorMotionCommand.Pedometer.rawValue,
      PowerDirectorSmsCommand.Send.rawValue,
      PowerDirectorSmsCommand.Search.rawValue,
    )

  private val debugCommands = setOf("debug.logs", "debug.ed25519")

  @Test
  fun advertisedCapabilities_respectsFeatureAvailability() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags())

    assertContainsAll(capabilities, coreCapabilities)
    assertMissingAll(capabilities, optionalCapabilities)
  }

  @Test
  fun advertisedCapabilities_includesFeatureCapabilitiesWhenEnabled() {
    val capabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          voiceWakeEnabled = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
        ),
      )

    assertContainsAll(capabilities, coreCapabilities + optionalCapabilities)
  }

  @Test
  fun advertisedCommands_respectsFeatureAvailability() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags())

    assertContainsAll(commands, coreCommands)
    assertMissingAll(commands, optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_includesFeatureCommandsWhenEnabled() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
          debugBuild = true,
        ),
      )

    assertContainsAll(commands, coreCommands + optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_onlyIncludesSupportedMotionCommands() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        NodeRuntimeFlags(
          cameraEnabled = false,
          locationEnabled = false,
          sendSmsAvailable = false,
          readSmsAvailable = false,
          voiceWakeEnabled = false,
          motionActivityAvailable = true,
          motionPedometerAvailable = false,
          debugBuild = false,
        ),
      )

    assertTrue(commands.contains(PowerDirectorMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(PowerDirectorMotionCommand.Pedometer.rawValue))
  }

  @Test
  fun advertisedCommands_splitsSmsSendAndSearchAvailability() {
    val readOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(readSmsAvailable = true),
      )
    val sendOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(sendSmsAvailable = true),
      )

    assertTrue(readOnlyCommands.contains(PowerDirectorSmsCommand.Search.rawValue))
    assertFalse(readOnlyCommands.contains(PowerDirectorSmsCommand.Send.rawValue))
    assertTrue(sendOnlyCommands.contains(PowerDirectorSmsCommand.Send.rawValue))
    assertFalse(sendOnlyCommands.contains(PowerDirectorSmsCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_includeSmsWhenEitherSmsPathIsAvailable() {
    val readOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(readSmsAvailable = true),
      )
    val sendOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(sendSmsAvailable = true),
      )

    assertTrue(readOnlyCapabilities.contains(PowerDirectorCapability.Sms.rawValue))
    assertTrue(sendOnlyCapabilities.contains(PowerDirectorCapability.Sms.rawValue))
  }

  private fun defaultFlags(
    cameraEnabled: Boolean = false,
    locationEnabled: Boolean = false,
    sendSmsAvailable: Boolean = false,
    readSmsAvailable: Boolean = false,
    voiceWakeEnabled: Boolean = false,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    debugBuild: Boolean = false,
  ): NodeRuntimeFlags =
    NodeRuntimeFlags(
      cameraEnabled = cameraEnabled,
      locationEnabled = locationEnabled,
      sendSmsAvailable = sendSmsAvailable,
      readSmsAvailable = readSmsAvailable,
      voiceWakeEnabled = voiceWakeEnabled,
      motionActivityAvailable = motionActivityAvailable,
      motionPedometerAvailable = motionPedometerAvailable,
      debugBuild = debugBuild,
    )

  private fun assertContainsAll(actual: List<String>, expected: Set<String>) {
    expected.forEach { value -> assertTrue(actual.contains(value)) }
  }

  private fun assertMissingAll(actual: List<String>, forbidden: Set<String>) {
    forbidden.forEach { value -> assertFalse(actual.contains(value)) }
  }
}
