import Foundation

public enum PowerDirectorRemindersCommand: String, Codable, Sendable {
    case list = "reminders.list"
    case add = "reminders.add"
}

public enum PowerDirectorReminderStatusFilter: String, Codable, Sendable {
    case incomplete
    case completed
    case all
}

public struct PowerDirectorRemindersListParams: Codable, Sendable, Equatable {
    public var status: PowerDirectorReminderStatusFilter?
    public var limit: Int?

    public init(status: PowerDirectorReminderStatusFilter? = nil, limit: Int? = nil) {
        self.status = status
        self.limit = limit
    }
}

public struct PowerDirectorRemindersAddParams: Codable, Sendable, Equatable {
    public var title: String
    public var dueISO: String?
    public var notes: String?
    public var listId: String?
    public var listName: String?

    public init(
        title: String,
        dueISO: String? = nil,
        notes: String? = nil,
        listId: String? = nil,
        listName: String? = nil)
    {
        self.title = title
        self.dueISO = dueISO
        self.notes = notes
        self.listId = listId
        self.listName = listName
    }
}

public struct PowerDirectorReminderPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var title: String
    public var dueISO: String?
    public var completed: Bool
    public var listName: String?

    public init(
        identifier: String,
        title: String,
        dueISO: String? = nil,
        completed: Bool,
        listName: String? = nil)
    {
        self.identifier = identifier
        self.title = title
        self.dueISO = dueISO
        self.completed = completed
        self.listName = listName
    }
}

public struct PowerDirectorRemindersListPayload: Codable, Sendable, Equatable {
    public var reminders: [PowerDirectorReminderPayload]

    public init(reminders: [PowerDirectorReminderPayload]) {
        self.reminders = reminders
    }
}

public struct PowerDirectorRemindersAddPayload: Codable, Sendable, Equatable {
    public var reminder: PowerDirectorReminderPayload

    public init(reminder: PowerDirectorReminderPayload) {
        self.reminder = reminder
    }
}
