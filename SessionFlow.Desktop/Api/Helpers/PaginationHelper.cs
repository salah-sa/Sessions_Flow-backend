using System;
using System.Collections.Generic;

namespace SessionFlow.Desktop.Api.Helpers;

public static class PaginationHelper
{
    public static (int skip, int take) Normalize(int? page, int? pageSize)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? 20, 1, 100);
        return ((p - 1) * ps, ps);
    }

    public static object Envelope<T>(List<T> items, long totalCount, int page, int pageSize)
    {
        return new
        {
            items,
            totalCount,
            page,
            pageSize,
            hasMore = (long)page * pageSize < totalCount
        };
    }
}
