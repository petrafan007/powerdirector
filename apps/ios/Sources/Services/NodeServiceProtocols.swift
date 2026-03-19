import CoreLocation
import Foundation
import PowerDirectorKit
import UIKit

typealias PowerDirectorCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias PowerDirectorCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: PowerDirectorCameraSnapParams) async throws -> PowerDirectorCameraSnapResult
    func clip(params: PowerDirectorCameraClipParams) async throws -> PowerDirectorCameraClipResult
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: PowerDirectorLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: PowerDirectorLocationGetParams,
        desiredAccuracy: PowerDirectorLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: PowerDirectorLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> PowerDirectorDeviceStatusPayload
    func info() -> PowerDirectorDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: PowerDirectorPhotosLatestParams) async throws -> PowerDirectorPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: PowerDirectorContactsSearchParams) async throws -> PowerDirectorContactsSearchPayload
    func add(params: PowerDirectorContactsAddParams) async throws -> PowerDirectorContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: PowerDirectorCalendarEventsParams) async throws -> PowerDirectorCalendarEventsPayload
    func add(params: PowerDirectorCalendarAddParams) async throws -> PowerDirectorCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: PowerDirectorRemindersListParams) async throws -> PowerDirectorRemindersListPayload
    func add(params: PowerDirectorRemindersAddParams) async throws -> PowerDirectorRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: PowerDirectorMotionActivityParams) async throws -> PowerDirectorMotionActivityPayload
    func pedometer(params: PowerDirectorPedometerParams) async throws -> PowerDirectorPedometerPayload
}

struct WatchMessagingStatus: Sendable, Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchQuickReplyEvent: Sendable, Equatable {
    var replyId: String
    var promptId: String
    var actionId: String
    var actionLabel: String?
    var sessionKey: String?
    var note: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchNotificationSendResult: Sendable, Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func setReplyHandler(_ handler: (@Sendable (WatchQuickReplyEvent) -> Void)?)
    func sendNotification(
        id: String,
        params: PowerDirectorWatchNotifyParams) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
