// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "CheckoutFixture",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "Checkout", targets: ["Checkout"]),
    ],
    targets: [
        .target(name: "Checkout"),
        .testTarget(name: "CheckoutTests", dependencies: ["Checkout"]),
    ]
)
