@inlinable
public func with<T>(
    _ value: T,
    _ body: (_ value: inout T) throws -> Void
) rethrows -> T {
    var value = value
    try body(&value)
    return value
}

@inlinable
public func with<T, R>(
    _ value: inout T,
    _ body: (_ value: inout T) throws -> R
) rethrows -> R {
    try body(&value)
}
