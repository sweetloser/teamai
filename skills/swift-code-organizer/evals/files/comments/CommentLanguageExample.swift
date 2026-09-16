import Foundation

protocol CompletionNotifying {
    func complete(generation: Int)
}

final class UploadCoordinator {
    // MARK: - State

    /// Tracks the last published generation so stale callbacks can be ignored.
    private(set) var publishedGeneration = 0

    // swiftlint:disable:next identifier_name
    private var q: [() -> Void] = []

    // MARK: - Actions

    // Publish the generation before notifying observers because callbacks may re-enter.
    func complete(generation: Int) {
        publishedGeneration = generation
        q.forEach { callback in
            callback()
        }
    }

    // TODO: Replace this bridge after the legacy callback API is removed.
    func addObserver(_ callback: @escaping () -> Void) {
        q.append(callback)
    }
}

// MARK: - CompletionNotifying

extension UploadCoordinator: CompletionNotifying {}
