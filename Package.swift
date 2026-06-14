// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "ShiroPet",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "ShiroPet", targets: ["ShiroPet"])
    ],
    targets: [
        .executableTarget(
            name: "ShiroPet",
            path: "Sources/ShiroPet"
        )
    ]
)
