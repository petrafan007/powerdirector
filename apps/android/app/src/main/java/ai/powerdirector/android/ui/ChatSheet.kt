package ai.powerdirector.android.ui

import androidx.compose.runtime.Composable
import ai.powerdirector.android.MainViewModel
import ai.powerdirector.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
