// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "LazyPropertyExample",
    platforms: [
        .macOS(.v13),
    ],
    products: [
        .library(name: "LazyPropertyExample", targets: ["LazyPropertyExample"]),
    ],
    targets: [
        .target(name: "UGCommonKit"),
        .target(
            name: "LazyPropertyExample",
            dependencies: ["UGCommonKit"]
        ),
        .testTarget(
            name: "LazyPropertyExampleTests",
            dependencies: ["LazyPropertyExample"]
        ),
    ]
)
