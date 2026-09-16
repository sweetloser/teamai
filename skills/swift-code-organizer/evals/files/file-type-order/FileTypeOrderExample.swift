import Foundation

private enum RenderMode {
    case compact
    case detailed
}

private final class NameFormatter {
    func format(_ name: String, mode: RenderMode) -> String {
        switch mode {
        case .compact:
            name
        case .detailed:
            "Name: \(name)"
        }
    }
}

extension NameFormatter: CustomDebugStringConvertible {
    var debugDescription: String {
        "NameFormatter"
    }
}

final class FileTypeOrderExample {
    struct Cache {
        var value = ""
    }

    private let formatter = NameFormatter()

    func render(_ name: String) -> String {
        formatter.format(name, mode: .detailed)
    }
}

extension FileTypeOrderExample: CustomStringConvertible {
    var description: String {
        render("Example")
    }
}
