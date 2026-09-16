import SwiftUI

@MainActor
final class ProfileModel: ObservableObject {
    @Published var userID = "user-42"
    @Published var names = ["Ada", "Grace"]

    func load(userID: String) async {}
}

struct ProfileView: View {
    @StateObject private var model = ProfileModel()

    var body: some View {
        VStack(alignment: .leading) {
            Text("People")
                .font(.headline)

            ForEach(model.names, id: \.self) { name in
                Text(name)
                    .padding(8)
                    .background(Color.blue.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .accessibilityLabel("Profile for \(name)")
            }
        }
        .task(id: model.userID) {
            await model.load(userID: model.userID)
        }
        .animation(.default, value: model.names)
    }
}
