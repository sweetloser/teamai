import Foundation

public protocol CheckoutSubmitting {
    func submit(items: [CheckoutItem]) throws -> Int
}

public struct CheckoutItem: Equatable, Sendable {
    public let quantity: Int
    public let unitPrice: Int

    public init(quantity: Int, unitPrice: Int) {
        self.quantity = quantity
        self.unitPrice = unitPrice
    }
}

public enum CheckoutError: Error, Equatable, LocalizedError {
    case emptyCart
    case invalidQuantity

    public var errorDescription: String? {
        switch self {
        case .emptyCart:
            return "Your cart is empty."
        case .invalidQuantity:
            return "Every item needs a positive quantity."
        }
    }
}

public final class CheckoutViewModel {
    public init() {}

    public func submit(items: [CheckoutItem]) throws -> Int {
        if items.isEmpty == false {
            var hasInvalidQuantity = false
            for item in items {
                if item.quantity <= 0 {
                    hasInvalidQuantity = true
                }
            }
            if hasInvalidQuantity == false {
                var total = 0
                for item in items {
                    total = total + (item.quantity * item.unitPrice)
                }
                return total
            } else {
                throw CheckoutError.invalidQuantity
            }
        } else {
            throw CheckoutError.emptyCart
        }
    }
}

extension CheckoutViewModel: CheckoutSubmitting {}
