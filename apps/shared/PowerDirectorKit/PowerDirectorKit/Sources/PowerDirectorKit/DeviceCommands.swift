import Foundation

public enum PowerDirectorDeviceCommand: String, Codable, Sendable {
    case status = "device.status"
    case info = "device.info"
}

public enum PowerDirectorBatteryState: String, Codable, Sendable {
    case unknown
    case unplugged
    case charging
    case full
}

public enum PowerDirectorThermalState: String, Codable, Sendable {
    case nominal
    case fair
    case serious
    case critical
}

public enum PowerDirectorNetworkPathStatus: String, Codable, Sendable {
    case satisfied
    case unsatisfied
    case requiresConnection
}

public enum PowerDirectorNetworkInterfaceType: String, Codable, Sendable {
    case wifi
    case cellular
    case wired
    case other
}

public struct PowerDirectorBatteryStatusPayload: Codable, Sendable, Equatable {
    public var level: Double?
    public var state: PowerDirectorBatteryState
    public var lowPowerModeEnabled: Bool

    public init(level: Double?, state: PowerDirectorBatteryState, lowPowerModeEnabled: Bool) {
        self.level = level
        self.state = state
        self.lowPowerModeEnabled = lowPowerModeEnabled
    }
}

public struct PowerDirectorThermalStatusPayload: Codable, Sendable, Equatable {
    public var state: PowerDirectorThermalState

    public init(state: PowerDirectorThermalState) {
        self.state = state
    }
}

public struct PowerDirectorStorageStatusPayload: Codable, Sendable, Equatable {
    public var totalBytes: Int64
    public var freeBytes: Int64
    public var usedBytes: Int64

    public init(totalBytes: Int64, freeBytes: Int64, usedBytes: Int64) {
        self.totalBytes = totalBytes
        self.freeBytes = freeBytes
        self.usedBytes = usedBytes
    }
}

public struct PowerDirectorNetworkStatusPayload: Codable, Sendable, Equatable {
    public var status: PowerDirectorNetworkPathStatus
    public var isExpensive: Bool
    public var isConstrained: Bool
    public var interfaces: [PowerDirectorNetworkInterfaceType]

    public init(
        status: PowerDirectorNetworkPathStatus,
        isExpensive: Bool,
        isConstrained: Bool,
        interfaces: [PowerDirectorNetworkInterfaceType])
    {
        self.status = status
        self.isExpensive = isExpensive
        self.isConstrained = isConstrained
        self.interfaces = interfaces
    }
}

public struct PowerDirectorDeviceStatusPayload: Codable, Sendable, Equatable {
    public var battery: PowerDirectorBatteryStatusPayload
    public var thermal: PowerDirectorThermalStatusPayload
    public var storage: PowerDirectorStorageStatusPayload
    public var network: PowerDirectorNetworkStatusPayload
    public var uptimeSeconds: Double

    public init(
        battery: PowerDirectorBatteryStatusPayload,
        thermal: PowerDirectorThermalStatusPayload,
        storage: PowerDirectorStorageStatusPayload,
        network: PowerDirectorNetworkStatusPayload,
        uptimeSeconds: Double)
    {
        self.battery = battery
        self.thermal = thermal
        self.storage = storage
        self.network = network
        self.uptimeSeconds = uptimeSeconds
    }
}

public struct PowerDirectorDeviceInfoPayload: Codable, Sendable, Equatable {
    public var deviceName: String
    public var modelIdentifier: String
    public var systemName: String
    public var systemVersion: String
    public var appVersion: String
    public var appBuild: String
    public var locale: String

    public init(
        deviceName: String,
        modelIdentifier: String,
        systemName: String,
        systemVersion: String,
        appVersion: String,
        appBuild: String,
        locale: String)
    {
        self.deviceName = deviceName
        self.modelIdentifier = modelIdentifier
        self.systemName = systemName
        self.systemVersion = systemVersion
        self.appVersion = appVersion
        self.appBuild = appBuild
        self.locale = locale
    }
}
