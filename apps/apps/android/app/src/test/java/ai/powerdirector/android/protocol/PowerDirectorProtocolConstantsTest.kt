package ai.powerdirector.android.protocol

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
    assertEquals("screen", PowerDirectorCapability.Screen.rawValue)
    assertEquals("voiceWake", PowerDirectorCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", PowerDirectorScreenCommand.Record.rawValue)
  }
}
