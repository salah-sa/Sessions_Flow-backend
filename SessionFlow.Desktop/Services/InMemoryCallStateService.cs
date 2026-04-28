using System.Collections.Concurrent;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Thread-safe in-memory call state registry.
/// Tracks which users are currently in an active call.
/// Registered as singleton — lives for the lifetime of the process.
/// </summary>
public class InMemoryCallStateService : ICallStateService
{
    private readonly ConcurrentDictionary<string, ActiveCall> _activeCalls = new();
    // groupId → set of participant userIds
    private readonly ConcurrentDictionary<string, HashSet<string>> _groupParticipants = new();

    public void SetBusy(string userId, string peerId, bool isGroup = false, string? groupId = null)
    {
        _activeCalls[userId] = new ActiveCall(peerId, DateTimeOffset.UtcNow, isGroup, groupId);
    }

    public void SetFree(string userId)
    {
        _activeCalls.TryRemove(userId, out _);
    }

    public bool IsBusy(string userId)
        => _activeCalls.ContainsKey(userId);

    public ActiveCall? GetCallState(string userId)
        => _activeCalls.TryGetValue(userId, out var call) ? call : null;

    public void SetGroupBusy(string groupId, IEnumerable<string> participantIds)
    {
        var participants = participantIds.ToHashSet();
        _groupParticipants[groupId] = participants;
        foreach (var uid in participants)
        {
            _activeCalls[uid] = new ActiveCall(groupId, DateTimeOffset.UtcNow, IsGroup: true, GroupId: groupId);
        }
    }

    public void RemoveFromGroup(string groupId, string userId)
    {
        _activeCalls.TryRemove(userId, out _);
        if (_groupParticipants.TryGetValue(groupId, out var set))
        {
            set.Remove(userId);
            if (set.Count == 0) _groupParticipants.TryRemove(groupId, out _);
        }
    }
}
