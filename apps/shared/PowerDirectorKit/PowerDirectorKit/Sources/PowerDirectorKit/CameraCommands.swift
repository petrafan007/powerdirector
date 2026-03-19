import Foundation

public enum PowerDirectorCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum PowerDirectorCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum PowerDirectorCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum PowerDirectorCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct PowerDirectorCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: PowerDirectorCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: PowerDirectorCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: PowerDirectorCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: PowerDirectorCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct PowerDirectorCameraClipParams: Codable, Sendable, Equatable {
    public var facing: PowerDirectorCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: PowerDirectorCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: PowerDirectorCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: PowerDirectorCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
