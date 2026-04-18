
Add-Type -Path 'd:\Work\assets outer\test\SessionFlow\SessionFlow.Desktop\bin\Debug\net9.0-windows\win-x64\MongoDB.Bson.dll'
Add-Type -Path 'd:\Work\assets outer\test\SessionFlow\SessionFlow.Desktop\bin\Debug\net9.0-windows\win-x64\MongoDB.Driver.dll'

$connString = 'mongodb+srv://ValorantChampion:2BYnW4RvtkMsgp9@cluster0.odvfzoz.mongodb.net/'
$client = [MongoDB.Driver.MongoClient]::new($connString)
$db = $client.GetDatabase('SessionFlow')
$collection = $db.GetCollection([MongoDB.Bson.BsonDocument], 'Users')

$filter = [MongoDB.Driver.FilterDefinition[MongoDB.Bson.BsonDocument]]::Empty
$users = $collection.Find($filter).Limit(20).ToListAsync().GetAwaiter().GetResult()

foreach ($u in $users) {
    Write-Host "---"
    Write-Host "Name: $($u['Name'])"
    Write-Host "Username: $($u['Username'])"
    Write-Host "SID: $($u['StudentId'])"
    Write-Host "EngCode: $($u['EngineerCode'])"
    Write-Host "Role: $($u['Role'])"
}
