namespace SessionFlow.Desktop.Services;

public record ActiveCall(string PeerId, DateTimeOffset StartedAt, bool IsGroup = false, string? GroupId = null);

public interface ICallStateService
{
    void SetBusy(string userId, string peerId, bool isGroup = false, string? groupId = null);
    void SetFree(string userId);
    bool IsBusy(string userId);
    ActiveCall? GetCallState(string userId);
    void SetGroupBusy(string groupId, IEnumerable<string> participantIds);
    void RemoveFromGroup(string groupId, string userId);
}
