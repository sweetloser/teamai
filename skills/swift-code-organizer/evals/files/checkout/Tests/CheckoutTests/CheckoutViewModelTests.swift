@testable import Checkout
import Testing

@Test func emptyCartPreservesError() {
    let subject = CheckoutViewModel()

    #expect(throws: CheckoutError.emptyCart) {
        try subject.submit(items: [])
    }
}

@Test func invalidQuantityPreservesError() {
    let subject = CheckoutViewModel()

    #expect(throws: CheckoutError.invalidQuantity) {
        try subject.submit(items: [CheckoutItem(quantity: 0, unitPrice: 10)])
    }
}

@Test func totalsValidItems() throws {
    let subject = CheckoutViewModel()

    let total = try subject.submit(items: [
        CheckoutItem(quantity: 2, unitPrice: 15),
        CheckoutItem(quantity: 1, unitPrice: 7),
    ])

    #expect(total == 37)
}
