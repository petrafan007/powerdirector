import Foundation
import Testing
@testable import PowerDirector

@Suite(.serialized) struct NodeServiceManagerTests {
    @Test func `builds node service commands with current CLI shape`() throws {
        let tmp = try makeTempDirForTests()
        CommandResolver.setProjectRoot(tmp.path)

        let powerdirectorPath = tmp.appendingPathComponent("node_modules/.bin/powerdirector")
        try makeExecutableForTests(at: powerdirectorPath)

        let start = NodeServiceManager._testServiceCommand(["start"])
        #expect(start == [powerdirectorPath.path, "node", "start", "--json"])

        let stop = NodeServiceManager._testServiceCommand(["stop"])
        #expect(stop == [powerdirectorPath.path, "node", "stop", "--json"])
    }
}
