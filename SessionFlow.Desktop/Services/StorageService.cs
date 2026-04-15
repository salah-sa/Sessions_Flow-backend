using System.IO;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using SessionFlow.Desktop.Data;

namespace SessionFlow.Desktop.Services;

public class StorageService
{
    private readonly IGridFSBucket _bucket;

    public StorageService(MongoService db)
    {
        _bucket = new GridFSBucket(db.Database, new GridFSBucketOptions
        {
            BucketName = "media",
            ChunkSizeBytes = 1048576, // 1MB chunks
        });
    }

    public async Task<string> UploadFileAsync(Stream source, string filename, string contentType)
    {
        var options = new GridFSUploadOptions
        {
            Metadata = new MongoDB.Bson.BsonDocument
            {
                { "contentType", contentType }
            }
        };

        var id = await _bucket.UploadFromStreamAsync(filename, source, options);
        return id.ToString();
    }

    public async Task DownloadFileAsync(string id, Stream destination)
    {
        if (MongoDB.Bson.ObjectId.TryParse(id, out var objectId))
        {
            await _bucket.DownloadToStreamAsync(objectId, destination);
        }
        else
        {
            throw new ArgumentException("Invalid file ID format.");
        }
    }

    public async Task<string> GetContentTypeAsync(string id)
    {
        if (MongoDB.Bson.ObjectId.TryParse(id, out var objectId))
        {
            var filter = Builders<GridFSFileInfo>.Filter.Eq(x => x.Id, objectId);
            var fileInfo = await _bucket.FindAsync(filter).Result.FirstOrDefaultAsync();
            if (fileInfo != null && fileInfo.Metadata.Contains("contentType"))
            {
                return fileInfo.Metadata["contentType"].AsString;
            }
        }
        return "application/octet-stream";
    }
}
