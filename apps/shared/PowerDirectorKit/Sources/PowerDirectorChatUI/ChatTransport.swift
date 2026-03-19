import Foundation

public enum PowerDirectorChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(PowerDirectorChatEventPayload)
    case agent(PowerDirectorAgentEventPayload)
    case seqGap
}

public protocol PowerDirectorChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> PowerDirectorChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [PowerDirectorChatAttachmentPayload]) async throws -> PowerDirectorChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> PowerDirectorChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<PowerDirectorChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension PowerDirectorChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "PowerDirectorChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> PowerDirectorChatSessionsListResponse {
        throw NSError(
            domain: "PowerDirectorChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
