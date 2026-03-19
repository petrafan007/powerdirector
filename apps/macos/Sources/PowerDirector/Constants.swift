import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-powerdirector writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.powerdirector.mac"
let gatewayLaunchdLabel = "ai.powerdirector.gateway"
let onboardingVersionKey = "powerdirector.onboardingVersion"
let onboardingSeenKey = "powerdirector.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "powerdirector.pauseEnabled"
let iconAnimationsEnabledKey = "powerdirector.iconAnimationsEnabled"
let swabbleEnabledKey = "powerdirector.swabbleEnabled"
let swabbleTriggersKey = "powerdirector.swabbleTriggers"
let voiceWakeTriggerChimeKey = "powerdirector.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "powerdirector.voiceWakeSendChime"
let showDockIconKey = "powerdirector.showDockIcon"
let defaultVoiceWakeTriggers = ["powerdirector"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "powerdirector.voiceWakeMicID"
let voiceWakeMicNameKey = "powerdirector.voiceWakeMicName"
let voiceWakeLocaleKey = "powerdirector.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "powerdirector.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "powerdirector.voicePushToTalkEnabled"
let talkEnabledKey = "powerdirector.talkEnabled"
let iconOverrideKey = "powerdirector.iconOverride"
let connectionModeKey = "powerdirector.connectionMode"
let remoteTargetKey = "powerdirector.remoteTarget"
let remoteIdentityKey = "powerdirector.remoteIdentity"
let remoteProjectRootKey = "powerdirector.remoteProjectRoot"
let remoteCliPathKey = "powerdirector.remoteCliPath"
let canvasEnabledKey = "powerdirector.canvasEnabled"
let cameraEnabledKey = "powerdirector.cameraEnabled"
let systemRunPolicyKey = "powerdirector.systemRunPolicy"
let systemRunAllowlistKey = "powerdirector.systemRunAllowlist"
let systemRunEnabledKey = "powerdirector.systemRunEnabled"
let locationModeKey = "powerdirector.locationMode"
let locationPreciseKey = "powerdirector.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "powerdirector.peekabooBridgeEnabled"
let deepLinkKeyKey = "powerdirector.deepLinkKey"
let modelCatalogPathKey = "powerdirector.modelCatalogPath"
let modelCatalogReloadKey = "powerdirector.modelCatalogReload"
let cliInstallPromptedVersionKey = "powerdirector.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "powerdirector.heartbeatsEnabled"
let debugPaneEnabledKey = "powerdirector.debugPaneEnabled"
let debugFileLogEnabledKey = "powerdirector.debug.fileLogEnabled"
let appLogLevelKey = "powerdirector.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
