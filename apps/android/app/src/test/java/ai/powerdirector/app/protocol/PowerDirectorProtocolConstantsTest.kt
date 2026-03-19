package ai.powerdirector.app.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class PowerDirectorProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", PowerDirectorCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", PowerDirectorCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", PowerDirectorCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", PowerDirectorCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", PowerDirectorCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", PowerDirectorCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", PowerDirectorCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", PowerDirectorCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", PowerDirectorCapability.Canvas.rawValue)
    assertEquals("camera", PowerDirectorCapability.Camera.rawValue)
    assertEquals("voiceWake", PowerDirectorCapability.VoiceWake.rawValue)
    assertEquals("location", PowerDirectorCapability.Location.rawValue)
    assertEquals("sms", PowerDirectorCapability.Sms.rawValue)
    assertEquals("device", PowerDirectorCapability.Device.rawValue)
    assertEquals("notifications", PowerDirectorCapability.Notifications.rawValue)
    assertEquals("system", PowerDirectorCapability.System.rawValue)
    assertEquals("photos", PowerDirectorCapability.Photos.rawValue)
    assertEquals("contacts", PowerDirectorCapability.Contacts.rawValue)
    assertEquals("calendar", PowerDirectorCapability.Calendar.rawValue)
    assertEquals("motion", PowerDirectorCapability.Motion.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", PowerDirectorCameraCommand.List.rawValue)
    assertEquals("camera.snap", PowerDirectorCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", PowerDirectorCameraCommand.Clip.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", PowerDirectorNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", PowerDirectorNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", PowerDirectorDeviceCommand.Status.rawValue)
    assertEquals("device.info", PowerDirectorDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", PowerDirectorDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", PowerDirectorDeviceCommand.Health.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", PowerDirectorSystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", PowerDirectorPhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", PowerDirectorContactsCommand.Search.rawValue)
    assertEquals("contacts.add", PowerDirectorContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", PowerDirectorCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", PowerDirectorCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", PowerDirectorMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", PowerDirectorMotionCommand.Pedometer.rawValue)
  }
}
