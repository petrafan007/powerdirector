// swift-tools-version: 6.2
// Package manifest for the PowerDirector macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "PowerDirector",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "PowerDirectorIPC", targets: ["PowerDirectorIPC"]),
        .library(name: "PowerDirectorDiscovery", targets: ["PowerDirectorDiscovery"]),
        .executable(name: "PowerDirector", targets: ["PowerDirector"]),
        .executable(name: "powerdirector-mac", targets: ["PowerDirectorMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/PowerDirectorKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "PowerDirectorIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "PowerDirectorDiscovery",
            dependencies: [
                .product(name: "PowerDirectorKit", package: "PowerDirectorKit"),
            ],
            path: "Sources/PowerDirectorDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "PowerDirector",
            dependencies: [
                "PowerDirectorIPC",
                "PowerDirectorDiscovery",
                .product(name: "PowerDirectorKit", package: "PowerDirectorKit"),
                .product(name: "PowerDirectorChatUI", package: "PowerDirectorKit"),
                .product(name: "PowerDirectorProtocol", package: "PowerDirectorKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/PowerDirector.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "PowerDirectorMacCLI",
            dependencies: [
                "PowerDirectorDiscovery",
                .product(name: "PowerDirectorKit", package: "PowerDirectorKit"),
                .product(name: "PowerDirectorProtocol", package: "PowerDirectorKit"),
            ],
            path: "Sources/PowerDirectorMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "PowerDirectorIPCTests",
            dependencies: [
                "PowerDirectorIPC",
                "PowerDirector",
                "PowerDirectorDiscovery",
                .product(name: "PowerDirectorProtocol", package: "PowerDirectorKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
