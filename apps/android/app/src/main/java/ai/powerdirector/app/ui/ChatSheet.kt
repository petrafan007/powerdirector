package ai.powerdirector.app.ui

import androidx.compose.runtime.Composable
import ai.powerdirector.app.MainViewModel
import ai.powerdirector.app.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
