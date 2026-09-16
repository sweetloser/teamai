import Foundation

@MainActor
@objc final class NetworkClient: NSObject {
    private weak var delegate: NetworkClientDelegate?

    init(delegate: NetworkClientDelegate) {
        self.delegate = delegate
    }

    func loadPair() async throws -> (Data, Data) {
        try await withTaskCancellationHandler {
            async let first = fetch(path: "/first")
            async let second = fetch(path: "/second")
            return try await (first, second)
        } onCancel: { [weak self] in
            self?.cancelRequests()
        }
    }

    @objc private func timerDidFire(_ timer: Timer) {
        delegate?.networkClientDidTick(self)
    }

    private func fetch(path: String) async throws -> Data {
        Data(path.utf8)
    }

    private nonisolated func cancelRequests() {}
}

@MainActor
protocol NetworkClientDelegate: AnyObject {
    func networkClientDidTick(_ client: NetworkClient)
}
