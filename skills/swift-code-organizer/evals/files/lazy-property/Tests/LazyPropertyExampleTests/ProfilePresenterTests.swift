import XCTest
@testable import LazyPropertyExample

final class ProfilePresenterTests: XCTestCase {
    func testFormatterIsCreatedOnFirstAccessOnly() {
        let presenter = ProfilePresenter(suffix: "!")

        XCTAssertEqual(presenter.formatterCreationCount, 0)
        XCTAssertEqual(presenter.render(name: "Ada"), "Profile: Ada!")
        XCTAssertEqual(presenter.formatterCreationCount, 1)
        XCTAssertEqual(presenter.render(name: "Grace"), "Profile: Grace!")
        XCTAssertEqual(presenter.formatterCreationCount, 1)
    }

    func testTransformDoesNotRetainPresenter() {
        var presenter: ProfilePresenter? = ProfilePresenter(suffix: "!")
        weak let weakPresenter = presenter
        let transform = presenter?.configuredTransform()

        XCTAssertEqual(transform?("Ada"), "Ada!")

        presenter = nil

        XCTAssertNil(weakPresenter)
        XCTAssertEqual(transform?("Ada"), "Ada")
    }
}
