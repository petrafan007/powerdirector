// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "PowerDirectorKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "PowerDirectorProtocol", targets: ["PowerDirectorProtocol"]),
        .library(name: "PowerDirectorKit", targets: ["PowerDirectorKit"]),
        .library(name: "PowerDirectorChatUI", targets: ["PowerDirectorChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "PowerDirectorProtocol",
            path: "Sources/PowerDirectorProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "PowerDirectorKit",
            dependencies: [
                "PowerDirectorProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/PowerDirectorKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "PowerDirectorChatUI",
            dependencies: [
                "PowerDirectorKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/PowerDirectorChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "PowerDirectorKitTests",
            dependencies: ["PowerDirectorKit", "PowerDirectorChatUI"],
            path: "Tests/PowerDirectorKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
