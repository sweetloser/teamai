import UGCommonKit

public final class TextFormatter {
    public var prefix = ""
    public var transform: ((String) -> String)?

    public init() {}

    public func render(_ value: String) -> String {
        prefix + (transform?(value) ?? value)
    }
}

public final class ProfilePresenter {
    private let suffix: String

    public private(set) var formatterCreationCount = 0

    public init(suffix: String) {
        self.suffix = suffix
    }

    private lazy var formatter: TextFormatter = {
        let formatter = TextFormatter()
        self.formatterCreationCount += 1
        formatter.prefix = "Profile: "
        formatter.transform = { [weak self] value in
            guard let self else {
                return value
            }

            return value + self.suffix
        }
        return formatter
    }()

    public func render(name: String) -> String {
        formatter.render(name)
    }

    func configuredTransform() -> ((String) -> String)? {
        formatter.transform
    }
}
