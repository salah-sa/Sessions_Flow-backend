using System.Linq;
using System.Linq.Expressions;
using MongoDB.Driver;
using MongoDB.Driver.Linq;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop.Data;

public class TenantRepository<T> where T : class, ITenantEntity
{
    public readonly IMongoCollection<T> _collection;
    private readonly ITenantAccessor _tenantAccessor;

    public TenantRepository(IMongoDatabase database, string collectionName, ITenantAccessor tenantAccessor)
    {
        _collection = database.GetCollection<T>(collectionName);
        _tenantAccessor = tenantAccessor;
    }

    public IMongoIndexManager<T> Indexes => _collection.Indexes;

    public FilterDefinition<T> GetTenantFilter()
    {
        var role = _tenantAccessor.CurrentRole;
        
        if (role == "Admin" || role == "System")
        {
            return Builders<T>.Filter.Empty;
        }
        else if (role == "Engineer")
        {
            var engId = _tenantAccessor.CurrentEngineerId;
            if (engId == null) throw new UnauthorizedAccessException("Engineer context missing.");
            return Builders<T>.Filter.Eq(x => x.EngineerId, engId.Value);
        }
        else if (role == "Student")
        {
            // For generic queries, Students shouldn't access tenant data directly via generic scans 
            // without explicitly providing the GroupId they belong to, but to be absolutely safe, 
            // if a Student accesses this, they will be blocked unless handled by specific service methods.
            throw new UnauthorizedAccessException("Students cannot perform unbound queries on tenant entities.");
        }
        
        throw new UnauthorizedAccessException($"Role '{role}' is not authorized for tenant queries.");
    }

    private FilterDefinition<T> ApplyTenantFilter(Expression<Func<T, bool>> filter)
    {
        return Builders<T>.Filter.And(Builders<T>.Filter.Where(filter), GetTenantFilter());
    }

    private FilterDefinition<T> ApplyTenantFilter(FilterDefinition<T> filter)
    {
        return Builders<T>.Filter.And(filter, GetTenantFilter());
    }

    public IFindFluent<T, T> Find(Expression<Func<T, bool>> filter)
    {
        return _collection.Find(ApplyTenantFilter(filter));
    }

    
    public IFindFluent<T, T> Find(IClientSessionHandle session, Expression<Func<T, bool>> filter, FindOptions? options = null) => _collection.Find(session, ApplyTenantFilter(filter), options);
    public IFindFluent<T, T> Find(IClientSessionHandle session, FilterDefinition<T> filter, FindOptions? options = null) => _collection.Find(session, ApplyTenantFilter(filter), options);
    public Task<T> FindOneAndUpdateAsync(IClientSessionHandle session, FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T, T>? options = null, CancellationToken cancellationToken = default) => _collection.FindOneAndUpdateAsync(session, ApplyTenantFilter(filter), update, options, cancellationToken);
    public Task<T> FindOneAndUpdateAsync(IClientSessionHandle session, Expression<Func<T, bool>> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T, T>? options = null, CancellationToken cancellationToken = default) => _collection.FindOneAndUpdateAsync(session, ApplyTenantFilter(filter), update, options, cancellationToken);
    public Task<BulkWriteResult<T>> BulkWriteAsync(IEnumerable<WriteModel<T>> requests, BulkWriteOptions? options = null, CancellationToken cancellationToken = default)
    {
        // We don't intercept BulkWrite easily, assume caller handles EngineerId
        return _collection.BulkWriteAsync(requests, options, cancellationToken);
    }

    public IFindFluent<T, T> Find(FilterDefinition<T> filter)
    {
        return _collection.Find(ApplyTenantFilter(filter));
    }

    public Task InsertOneAsync(T document, InsertOneOptions? options = null, CancellationToken cancellationToken = default)
    {
        EnforceEngineerId(document);
        return _collection.InsertOneAsync(document, options, cancellationToken);
    }

    public Task InsertOneAsync(IClientSessionHandle session, T document, InsertOneOptions? options = null, CancellationToken cancellationToken = default)
    {
        EnforceEngineerId(document);
        return _collection.InsertOneAsync(session, document, options, cancellationToken);
    }

    private void EnforceEngineerId(T document)
    {
        var role = _tenantAccessor.CurrentRole;
        if (role == "Engineer")
        {
            var engId = _tenantAccessor.CurrentEngineerId;
            if (engId != null)
            {
                document.EngineerId = engId.Value;
            }
        }
    }

    public Task<UpdateResult> UpdateOneAsync(Expression<Func<T, bool>> filter, UpdateDefinition<T> update, UpdateOptions? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.UpdateOneAsync(ApplyTenantFilter(filter), update, options, cancellationToken);
    }

    public Task<UpdateResult> UpdateOneAsync(IClientSessionHandle session, Expression<Func<T, bool>> filter, UpdateDefinition<T> update, UpdateOptions? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.UpdateOneAsync(session, ApplyTenantFilter(filter), update, options, cancellationToken);
    }

    public Task<UpdateResult> UpdateManyAsync(Expression<Func<T, bool>> filter, UpdateDefinition<T> update, UpdateOptions? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.UpdateManyAsync(ApplyTenantFilter(filter), update, options, cancellationToken);
    }

    public Task<UpdateResult> UpdateManyAsync(IClientSessionHandle session, Expression<Func<T, bool>> filter, UpdateDefinition<T> update, UpdateOptions? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.UpdateManyAsync(session, ApplyTenantFilter(filter), update, options, cancellationToken);
    }

    public Task<DeleteResult> DeleteOneAsync(Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
    {
        return _collection.DeleteOneAsync(ApplyTenantFilter(filter), cancellationToken);
    }

    public Task<DeleteResult> DeleteOneAsync(IClientSessionHandle session, Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
    {
        return _collection.DeleteOneAsync(session, ApplyTenantFilter(filter), null, cancellationToken);
    }

    public Task<DeleteResult> DeleteManyAsync(Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
    {
        return _collection.DeleteManyAsync(ApplyTenantFilter(filter), cancellationToken);
    }

    public Task<DeleteResult> DeleteManyAsync(IClientSessionHandle session, Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
    {
        return _collection.DeleteManyAsync(session, ApplyTenantFilter(filter), null, cancellationToken);
    }

    
    
    public Task<UpdateResult> UpdateOneAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, UpdateOptions? options = null, CancellationToken cancellationToken = default) => _collection.UpdateOneAsync(ApplyTenantFilter(filter), update, options, cancellationToken);
    public Task<UpdateResult> UpdateOneAsync(IClientSessionHandle session, FilterDefinition<T> filter, UpdateDefinition<T> update, UpdateOptions? options = null, CancellationToken cancellationToken = default) => _collection.UpdateOneAsync(session, ApplyTenantFilter(filter), update, options, cancellationToken);
    public Task<UpdateResult> UpdateManyAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, UpdateOptions? options = null, CancellationToken cancellationToken = default) => _collection.UpdateManyAsync(ApplyTenantFilter(filter), update, options, cancellationToken);
    public Task<UpdateResult> UpdateManyAsync(IClientSessionHandle session, FilterDefinition<T> filter, UpdateDefinition<T> update, UpdateOptions? options = null, CancellationToken cancellationToken = default) => _collection.UpdateManyAsync(session, ApplyTenantFilter(filter), update, options, cancellationToken);
    public Task<DeleteResult> DeleteOneAsync(FilterDefinition<T> filter, CancellationToken cancellationToken = default) => _collection.DeleteOneAsync(ApplyTenantFilter(filter), null, cancellationToken);
    public Task<DeleteResult> DeleteOneAsync(IClientSessionHandle session, FilterDefinition<T> filter, CancellationToken cancellationToken = default) => _collection.DeleteOneAsync(session, ApplyTenantFilter(filter), null, cancellationToken);
    public Task<DeleteResult> DeleteManyAsync(FilterDefinition<T> filter, CancellationToken cancellationToken = default) => _collection.DeleteManyAsync(ApplyTenantFilter(filter), null, cancellationToken);
    public Task<DeleteResult> DeleteManyAsync(IClientSessionHandle session, FilterDefinition<T> filter, CancellationToken cancellationToken = default) => _collection.DeleteManyAsync(session, ApplyTenantFilter(filter), null, cancellationToken);
    public Task<ReplaceOneResult> ReplaceOneAsync(FilterDefinition<T> filter, T replacement, ReplaceOptions? options = null, CancellationToken cancellationToken = default) => _collection.ReplaceOneAsync(ApplyTenantFilter(filter), replacement, options, cancellationToken);
    public Task<T> FindOneAndUpdateAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T, T>? options = null, CancellationToken cancellationToken = default) => _collection.FindOneAndUpdateAsync(ApplyTenantFilter(filter), update, options, cancellationToken);
    public Task<T> FindOneAndDeleteAsync(FilterDefinition<T> filter, FindOneAndDeleteOptions<T, T>? options = null, CancellationToken cancellationToken = default) => _collection.FindOneAndDeleteAsync(ApplyTenantFilter(filter), options, cancellationToken);

    public Task<long> CountDocumentsAsync(Expression<Func<T, bool>> filter, CountOptions? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.CountDocumentsAsync(ApplyTenantFilter(filter), options, cancellationToken);
    }

    public Task<long> CountDocumentsAsync(FilterDefinition<T> filter, CountOptions? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.CountDocumentsAsync(ApplyTenantFilter(filter), options, cancellationToken);
    }

    public Task InsertManyAsync(IEnumerable<T> documents, InsertManyOptions? options = null, CancellationToken cancellationToken = default)
    {
        foreach (var doc in documents) EnforceEngineerId(doc);
        return _collection.InsertManyAsync(documents, options, cancellationToken);
    }

    public Task InsertManyAsync(IClientSessionHandle session, IEnumerable<T> documents, InsertManyOptions? options = null, CancellationToken cancellationToken = default)
    {
        foreach (var doc in documents) EnforceEngineerId(doc);
        return _collection.InsertManyAsync(session, documents, options, cancellationToken);
    }

    public Task<ReplaceOneResult> ReplaceOneAsync(Expression<Func<T, bool>> filter, T replacement, ReplaceOptions? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.ReplaceOneAsync(ApplyTenantFilter(filter), replacement, options, cancellationToken);
    }

    public Task<T> FindOneAndUpdateAsync(Expression<Func<T, bool>> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T, T>? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.FindOneAndUpdateAsync(ApplyTenantFilter(filter), update, options, cancellationToken);
    }

    public Task<T> FindOneAndDeleteAsync(Expression<Func<T, bool>> filter, FindOneAndDeleteOptions<T, T>? options = null, CancellationToken cancellationToken = default)
    {
        return _collection.FindOneAndDeleteAsync(ApplyTenantFilter(filter), options, cancellationToken);
    }

    public IAggregateFluent<T> Aggregate(AggregateOptions? options = null)
    {
        var aggregate = _collection.Aggregate(options);
        var role = _tenantAccessor.CurrentRole;
        if (role == "Admin" || role == "System")
        {
            return aggregate;
        }
        else if (role == "Engineer")
        {
            var engId = _tenantAccessor.CurrentEngineerId;
            if (engId == null) throw new UnauthorizedAccessException("Engineer context missing.");
            return aggregate.Match(Builders<T>.Filter.Eq(x => x.EngineerId, engId.Value));
        }
        throw new UnauthorizedAccessException("Students cannot perform unbound aggregations on tenant entities.");
    }

    public IQueryable<T> AsQueryable(AggregateOptions? options = null)
    {
        var queryable = _collection.AsQueryable(options);
        
        var role = _tenantAccessor.CurrentRole;
        if (role == "Admin" || role == "System")
        {
            return queryable;
        }
        else if (role == "Engineer")
        {
            var engId = _tenantAccessor.CurrentEngineerId;
            if (engId == null) throw new UnauthorizedAccessException("Engineer context missing.");
            return queryable.Where(x => x.EngineerId == engId.Value);
        }
        
        throw new UnauthorizedAccessException("Students cannot perform unbound queries on tenant entities.");
    }
}
