using MongoDB.Driver;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Seeds programming game challenges. All questions are PROGRAMMING-ONLY.
/// Domains: game_dev, web_dev, ai_ml, flutter, backend_systems.
/// </summary>
public static class ProgrammingGameSeeder
{
    public static async Task SeedAllAsync(IMongoDatabase db)
    {
        await SeedDebugChallengesAsync(db);
        await SeedCodeSnippetsAsync(db);
        await SeedAlgorithmChallengesAsync(db);
        await SeedStackChallengesAsync(db);
        await SeedBugHunterChallengesAsync(db);
        await SeedApiChallengesAsync(db);
    }

    private static async Task SeedDebugChallengesAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<DebugChallenge>("prog_debug_challenges");
        if (await col.CountDocumentsAsync(FilterDefinition<DebugChallenge>.Empty) > 0) return;

        var items = new List<DebugChallenge>
        {
            new() { Language = "javascript", Domain = "web_dev", Title = "Async Fetch Bug", Difficulty = 1, TimeLimitSeconds = 30,
                BuggyCode = "async function getData() {\n  const res = fetch('/api/data');\n  const json = await res.json();\n  return json;\n}",
                FixedCode = "async function getData() {\n  const res = await fetch('/api/data');\n  const json = await res.json();\n  return json;\n}",
                BugLineNumber = 2, BugExplanation = "Missing 'await' before fetch(). Without it, res is a Promise, not a Response." },

            new() { Language = "javascript", Domain = "web_dev", Title = "Event Listener Leak", Difficulty = 1, TimeLimitSeconds = 30,
                BuggyCode = "useEffect(() => {\n  window.addEventListener('resize', handleResize);\n}, []);",
                FixedCode = "useEffect(() => {\n  window.addEventListener('resize', handleResize);\n  return () => window.removeEventListener('resize', handleResize);\n}, []);",
                BugLineNumber = 3, BugExplanation = "Missing cleanup function. The event listener is never removed, causing a memory leak." },

            new() { Language = "python", Domain = "ai_ml", Title = "Model Fit Bug", Difficulty = 2, TimeLimitSeconds = 45,
                BuggyCode = "model = Sequential()\nmodel.add(Dense(64, activation='relu'))\nmodel.add(Dense(10, activation='relu'))\nmodel.compile(optimizer='adam', loss='categorical_crossentropy')\nmodel.fit(X_train, y_train, epochs=10)",
                FixedCode = "model = Sequential()\nmodel.add(Dense(64, activation='relu'))\nmodel.add(Dense(10, activation='softmax'))\nmodel.compile(optimizer='adam', loss='categorical_crossentropy')\nmodel.fit(X_train, y_train, epochs=10)",
                BugLineNumber = 3, BugExplanation = "Output layer uses 'relu' instead of 'softmax'. For multi-class classification with categorical_crossentropy, the output must use softmax." },

            new() { Language = "dart", Domain = "flutter", Title = "setState After Dispose", Difficulty = 2, TimeLimitSeconds = 45,
                BuggyCode = "void fetchData() async {\n  final data = await api.getData();\n  setState(() {\n    _items = data;\n  });\n}",
                FixedCode = "void fetchData() async {\n  final data = await api.getData();\n  if (!mounted) return;\n  setState(() {\n    _items = data;\n  });\n}",
                BugLineNumber = 3, BugExplanation = "setState called without checking 'mounted'. If the widget is disposed during the await, this crashes." },

            new() { Language = "csharp", Domain = "backend_systems", Title = "SQL Injection", Difficulty = 1, TimeLimitSeconds = 30,
                BuggyCode = "var query = $\"SELECT * FROM Users WHERE Name = '{name}'\";\nvar result = connection.Execute(query);",
                FixedCode = "var query = \"SELECT * FROM Users WHERE Name = @Name\";\nvar result = connection.Execute(query, new { Name = name });",
                BugLineNumber = 1, BugExplanation = "String interpolation in SQL creates SQL injection vulnerability. Use parameterized queries." },

            new() { Language = "csharp", Domain = "game_dev", Title = "DeltaTime Missing", Difficulty = 1, TimeLimitSeconds = 30,
                BuggyCode = "void Update() {\n  transform.position += Vector3.forward * speed;\n}",
                FixedCode = "void Update() {\n  transform.position += Vector3.forward * speed * Time.deltaTime;\n}",
                BugLineNumber = 2, BugExplanation = "Movement is frame-rate dependent. Multiply by Time.deltaTime for consistent speed." },

            new() { Language = "javascript", Domain = "web_dev", Title = "Map Key Missing", Difficulty = 1, TimeLimitSeconds = 30,
                BuggyCode = "return (\n  <ul>\n    {items.map(item => (\n      <li>{item.name}</li>\n    ))}\n  </ul>\n);",
                FixedCode = "return (\n  <ul>\n    {items.map(item => (\n      <li key={item.id}>{item.name}</li>\n    ))}\n  </ul>\n);",
                BugLineNumber = 4, BugExplanation = "React list items need a unique 'key' prop for efficient reconciliation." },

            new() { Language = "python", Domain = "ai_ml", Title = "Data Leakage", Difficulty = 3, TimeLimitSeconds = 60,
                BuggyCode = "scaler = StandardScaler()\nX_scaled = scaler.fit_transform(X)\nX_train, X_test = train_test_split(X_scaled)\nmodel.fit(X_train, y_train)",
                FixedCode = "X_train, X_test = train_test_split(X)\nscaler = StandardScaler()\nX_train = scaler.fit_transform(X_train)\nX_test = scaler.transform(X_test)",
                BugLineNumber = 2, BugExplanation = "Scaling before split causes data leakage. Test data statistics leak into training." },

            new() { Language = "dart", Domain = "flutter", Title = "Wrong Widget Rebuild", Difficulty = 1, TimeLimitSeconds = 30,
                BuggyCode = "Widget build(BuildContext context) {\n  final controller = TextEditingController();\n  return TextField(controller: controller);\n}",
                FixedCode = "late final controller = TextEditingController();\n\nWidget build(BuildContext context) {\n  return TextField(controller: controller);\n}",
                BugLineNumber = 2, BugExplanation = "Creating controller inside build() causes it to reset every rebuild. Move to initState or late field." },

            new() { Language = "csharp", Domain = "backend_systems", Title = "Async Deadlock", Difficulty = 3, TimeLimitSeconds = 60,
                BuggyCode = "public string GetData() {\n  var result = GetDataAsync().Result;\n  return result;\n}\nprivate async Task<string> GetDataAsync() {\n  return await httpClient.GetStringAsync(\"/api/data\");\n}",
                FixedCode = "public async Task<string> GetData() {\n  var result = await GetDataAsync();\n  return result;\n}\nprivate async Task<string> GetDataAsync() {\n  return await httpClient.GetStringAsync(\"/api/data\");\n}",
                BugLineNumber = 2, BugExplanation = ".Result blocks synchronously, causing a deadlock with async context. Use await instead." },
        };
        await col.InsertManyAsync(items);
    }

    private static async Task SeedCodeSnippetsAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<CodeSnippet>("prog_code_snippets");
        if (await col.CountDocumentsAsync(FilterDefinition<CodeSnippet>.Empty) > 0) return;

        var items = new List<CodeSnippet>
        {
            new() { Language = "javascript", Domain = "web_dev", Difficulty = 1, Description = "Arrow function with array filter",
                Code = "const evens = numbers.filter(n => n % 2 === 0);", CharacterCount = 47 },
            new() { Language = "javascript", Domain = "web_dev", Difficulty = 2, Description = "React useState hook",
                Code = "const [count, setCount] = useState(0);", CharacterCount = 38 },
            new() { Language = "javascript", Domain = "web_dev", Difficulty = 2, Description = "Async API fetch",
                Code = "const res = await fetch('/api/users');\nconst data = await res.json();", CharacterCount = 65 },
            new() { Language = "python", Domain = "ai_ml", Difficulty = 1, Description = "List comprehension",
                Code = "squares = [x ** 2 for x in range(10)]", CharacterCount = 37 },
            new() { Language = "python", Domain = "ai_ml", Difficulty = 2, Description = "NumPy array reshape",
                Code = "X = np.array(data).reshape(-1, 1)", CharacterCount = 33 },
            new() { Language = "dart", Domain = "flutter", Difficulty = 1, Description = "StatelessWidget",
                Code = "class MyWidget extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return Container();\n  }\n}", CharacterCount = 109 },
            new() { Language = "dart", Domain = "flutter", Difficulty = 2, Description = "Navigator push",
                Code = "Navigator.push(context, MaterialPageRoute(builder: (_) => NextPage()));", CharacterCount = 71 },
            new() { Language = "csharp", Domain = "backend_systems", Difficulty = 1, Description = "LINQ query",
                Code = "var active = users.Where(u => u.IsActive).ToList();", CharacterCount = 51 },
            new() { Language = "csharp", Domain = "backend_systems", Difficulty = 2, Description = "Async controller action",
                Code = "public async Task<IActionResult> Get()\n{\n    var data = await _service.GetAllAsync();\n    return Ok(data);\n}", CharacterCount = 101 },
            new() { Language = "csharp", Domain = "game_dev", Difficulty = 1, Description = "Unity movement",
                Code = "transform.Translate(Vector3.forward * speed * Time.deltaTime);", CharacterCount = 62 },
        };
        await col.InsertManyAsync(items);
    }

    private static async Task SeedAlgorithmChallengesAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<AlgorithmChallenge>("prog_algo_challenges");
        if (await col.CountDocumentsAsync(FilterDefinition<AlgorithmChallenge>.Empty) > 0) return;

        var items = new List<AlgorithmChallenge>
        {
            new() { Domain = "web_dev", Difficulty = 1, TimeLimitSeconds = 20,
                ProblemStatement = "Which React hook is best for fetching data on component mount?",
                Options = new() { "useState", "useEffect", "useRef", "useMemo" }, CorrectIndex = 1,
                Explanation = "useEffect with an empty dependency array runs once on mount, ideal for data fetching." },
            new() { Domain = "web_dev", Difficulty = 2, TimeLimitSeconds = 25,
                ProblemStatement = "What is the time complexity of JavaScript's Array.prototype.includes()?",
                Options = new() { "O(1)", "O(log n)", "O(n)", "O(n²)" }, CorrectIndex = 2,
                Explanation = "includes() performs a linear scan of the array." },
            new() { Domain = "backend_systems", Difficulty = 1, TimeLimitSeconds = 20,
                ProblemStatement = "Which data structure provides O(1) average lookup time?",
                Options = new() { "Linked List", "Binary Tree", "Hash Table", "Array" }, CorrectIndex = 2,
                Explanation = "Hash tables use hashing for constant-time average lookups." },
            new() { Domain = "backend_systems", Difficulty = 2, TimeLimitSeconds = 25,
                ProblemStatement = "What does ACID stand for in database transactions?",
                Options = new() { "Atomicity, Consistency, Isolation, Durability", "Async, Cache, Index, Deploy", "Add, Create, Insert, Delete", "Aggregate, Compute, Iterate, Distribute" },
                CorrectIndex = 0, Explanation = "ACID guarantees reliable transaction processing in databases." },
            new() { Domain = "ai_ml", Difficulty = 1, TimeLimitSeconds = 20,
                ProblemStatement = "Which loss function is standard for binary classification?",
                Options = new() { "MSE", "Binary Cross-Entropy", "Hinge Loss", "MAE" }, CorrectIndex = 1,
                Explanation = "Binary cross-entropy measures the difference between predicted probabilities and actual binary labels." },
            new() { Domain = "ai_ml", Difficulty = 2, TimeLimitSeconds = 25,
                ProblemStatement = "What is 'overfitting' in machine learning?",
                Options = new() { "Model learns noise in training data", "Model is too simple", "Training takes too long", "Data is imbalanced" },
                CorrectIndex = 0, Explanation = "Overfitting occurs when a model memorizes training data including noise, performing poorly on unseen data." },
            new() { Domain = "flutter", Difficulty = 1, TimeLimitSeconds = 20,
                ProblemStatement = "What widget rebuilds when its Listenable changes in Flutter?",
                Options = new() { "AnimatedBuilder", "StatelessWidget", "Container", "Scaffold" }, CorrectIndex = 0,
                Explanation = "AnimatedBuilder listens to a Listenable and rebuilds its child when notified." },
            new() { Domain = "flutter", Difficulty = 2, TimeLimitSeconds = 25,
                ProblemStatement = "What is the purpose of 'const' constructors in Flutter?",
                Options = new() { "Compile-time constants for widget reuse", "Making variables immutable", "Enabling hot reload", "Preventing null values" },
                CorrectIndex = 0, Explanation = "Const constructors allow Flutter to reuse widget instances, improving performance." },
            new() { Domain = "game_dev", Difficulty = 1, TimeLimitSeconds = 20,
                ProblemStatement = "What is the purpose of deltaTime in game loops?",
                Options = new() { "Frame-rate independent movement", "Memory management", "Collision detection", "Asset loading" },
                CorrectIndex = 0, Explanation = "deltaTime ensures consistent behavior regardless of frame rate." },
            new() { Domain = "game_dev", Difficulty = 2, TimeLimitSeconds = 25,
                ProblemStatement = "Which design pattern manages game object behavior in Unity?",
                Options = new() { "Singleton", "Component pattern (ECS)", "Factory", "Observer" }, CorrectIndex = 1,
                Explanation = "Unity uses a Component-based architecture where behaviors are attached to GameObjects." },
            new() { Domain = "backend_systems", Difficulty = 3, TimeLimitSeconds = 30,
                ProblemStatement = "Which consistency model does DynamoDB use by default?",
                Options = new() { "Strong consistency", "Eventual consistency", "Causal consistency", "Linearizability" },
                CorrectIndex = 1, Explanation = "DynamoDB defaults to eventually consistent reads for higher throughput." },
            new() { Domain = "web_dev", Difficulty = 3, TimeLimitSeconds = 30,
                ProblemStatement = "What is the main advantage of Server Components in React 19?",
                Options = new() { "Zero client-side JavaScript for server-rendered parts", "Faster hot reload", "Better TypeScript support", "Smaller bundle size only" },
                CorrectIndex = 0, Explanation = "Server Components run on the server and send zero JS to the client, reducing bundle size and improving performance." },
        };
        await col.InsertManyAsync(items);
    }

    private static async Task SeedStackChallengesAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<StackChallenge>("prog_stack_challenges");
        if (await col.CountDocumentsAsync(FilterDefinition<StackChallenge>.Empty) > 0) return;

        var items = new List<StackChallenge>
        {
            new() { Language = "javascript", Domain = "web_dev", Difficulty = 1,
                Code = "let x = 5;\nlet y = x + 3;\nx = y * 2;\nlet z = x - y;",
                Steps = new() {
                    new() { StepNumber = 1, Question = "What is y after line 2?", CorrectAnswer = "8", Options = new() { "5", "8", "3", "10" } },
                    new() { StepNumber = 2, Question = "What is x after line 3?", CorrectAnswer = "16", Options = new() { "10", "13", "16", "8" } },
                    new() { StepNumber = 3, Question = "What is z after line 4?", CorrectAnswer = "8", Options = new() { "8", "6", "11", "3" } },
                } },
            new() { Language = "python", Domain = "ai_ml", Difficulty = 2,
                Code = "data = [1, 2, 3, 4, 5]\nresult = [x * 2 for x in data if x > 2]\ntotal = sum(result)\navg = total / len(result)",
                Steps = new() {
                    new() { StepNumber = 1, Question = "What is result after line 2?", CorrectAnswer = "[6, 8, 10]", Options = new() { "[2,4,6,8,10]", "[6,8,10]", "[3,4,5]", "[6,8]" } },
                    new() { StepNumber = 2, Question = "What is total after line 3?", CorrectAnswer = "24", Options = new() { "15", "24", "30", "18" } },
                    new() { StepNumber = 3, Question = "What is avg after line 4?", CorrectAnswer = "8.0", Options = new() { "6.0", "8.0", "4.8", "12.0" } },
                } },
            new() { Language = "dart", Domain = "flutter", Difficulty = 1,
                Code = "int a = 10;\nint b = a ~/ 3;\nint c = a % 3;\nbool d = c == 1;",
                Steps = new() {
                    new() { StepNumber = 1, Question = "What is b after line 2?", CorrectAnswer = "3", Options = new() { "3", "3.33", "4", "2" } },
                    new() { StepNumber = 2, Question = "What is c after line 3?", CorrectAnswer = "1", Options = new() { "0", "1", "2", "3" } },
                    new() { StepNumber = 3, Question = "What is d after line 4?", CorrectAnswer = "true", Options = new() { "true", "false", "null", "1" } },
                } },
            new() { Language = "csharp", Domain = "backend_systems", Difficulty = 2,
                Code = "var list = new List<int> { 3, 1, 4, 1, 5 };\nlist.Sort();\nvar first = list[0];\nvar last = list[^1];\nvar count = list.Count(x => x > 2);",
                Steps = new() {
                    new() { StepNumber = 1, Question = "What is list after Sort()?", CorrectAnswer = "[1,1,3,4,5]", Options = new() { "[5,4,3,1,1]", "[1,1,3,4,5]", "[1,3,4,5]", "[3,1,4,1,5]" } },
                    new() { StepNumber = 2, Question = "What is first?", CorrectAnswer = "1", Options = new() { "3", "1", "0", "5" } },
                    new() { StepNumber = 3, Question = "What is count?", CorrectAnswer = "3", Options = new() { "2", "3", "4", "5" } },
                } },
            new() { Language = "csharp", Domain = "game_dev", Difficulty = 1,
                Code = "float hp = 100f;\nfloat damage = 35f;\nhp -= damage;\nbool alive = hp > 0;\nhp -= damage;",
                Steps = new() {
                    new() { StepNumber = 1, Question = "What is hp after line 3?", CorrectAnswer = "65", Options = new() { "65", "100", "35", "70" } },
                    new() { StepNumber = 2, Question = "What is alive after line 4?", CorrectAnswer = "true", Options = new() { "true", "false", "65", "null" } },
                    new() { StepNumber = 3, Question = "What is hp after line 5?", CorrectAnswer = "30", Options = new() { "30", "0", "65", "-5" } },
                } },
        };
        await col.InsertManyAsync(items);
    }

    private static async Task SeedBugHunterChallengesAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<BugHunterChallenge>("prog_bug_hunter_challenges");
        if (await col.CountDocumentsAsync(FilterDefinition<BugHunterChallenge>.Empty) > 0) return;

        var items = new List<BugHunterChallenge>
        {
            new() { Language = "javascript", Domain = "web_dev", Title = "React Component Bugs", Difficulty = 1, TimeLimitSeconds = 90,
                Code = "function UserList({ users }) {\n  const [search, setSearch] = useState();\n  const filtered = users.filter(u =>\n    u.name.toLowerCase().includes(search)\n  );\n  useEffect(() => {\n    console.log('Filtered:', filtered);\n  });\n  return (\n    <div>\n      <input onChange={e => setSearch(e.target.value)} />\n      {filtered.map(u => (\n        <div>{u.name}</div>\n      ))}\n    </div>\n  );\n}",
                Bugs = new() {
                    new() { LineNumber = 2, BugType = "missing-initial-value", Explanation = "useState() with no initial value causes search to be undefined, breaking .includes()" },
                    new() { LineNumber = 7, BugType = "missing-deps", Explanation = "useEffect has no dependency array, runs every render unnecessarily" },
                    new() { LineNumber = 13, BugType = "missing-key", Explanation = "List items rendered without a key prop" },
                } },
            new() { Language = "python", Domain = "ai_ml", Title = "Training Pipeline Bugs", Difficulty = 2, TimeLimitSeconds = 90,
                Code = "import numpy as np\nfrom sklearn.model_selection import train_test_split\n\nX = np.random.rand(100, 5)\ny = np.random.randint(0, 2, 100)\n\nX_train, X_test, y_train, y_test = train_test_split(X, y)\n\nfrom sklearn.preprocessing import StandardScaler\nscaler = StandardScaler()\nX_train = scaler.fit_transform(X)\nX_test = scaler.fit_transform(X_test)\n\nfrom sklearn.linear_model import LogisticRegression\nmodel = LogisticRegression()\nmodel.fit(X_train, y_train)\nprint(f'Accuracy: {model.score(X_train, y_train)}')",
                Bugs = new() {
                    new() { LineNumber = 11, BugType = "data-leakage", Explanation = "fit_transform on full X instead of X_train — leaks test data" },
                    new() { LineNumber = 12, BugType = "wrong-transform", Explanation = "fit_transform on X_test instead of transform — fits new scaler on test data" },
                    new() { LineNumber = 17, BugType = "wrong-evaluation", Explanation = "Evaluating on X_train instead of X_test — doesn't measure generalization" },
                } },
            new() { Language = "csharp", Domain = "backend_systems", Title = "API Endpoint Bugs", Difficulty = 2, TimeLimitSeconds = 90,
                Code = "app.MapPost(\"/api/users\", async (UserDto dto, AppDb db) =>\n{\n    var user = new User\n    {\n        Name = dto.Name,\n        Email = dto.Email\n    };\n    db.Users.Add(user);\n    return Results.Ok(user);\n});\n\napp.MapGet(\"/api/users/{id}\", async (string id, AppDb db) =>\n{\n    var user = db.Users.Find(id);\n    return Results.Ok(user);\n});",
                Bugs = new() {
                    new() { LineNumber = 9, BugType = "missing-save", Explanation = "db.Users.Add() without SaveChangesAsync() — data never persists" },
                    new() { LineNumber = 9, BugType = "wrong-status", Explanation = "Should return Results.Created() for POST, not Results.Ok()" },
                    new() { LineNumber = 14, BugType = "no-null-check", Explanation = "No null check on user — returns 200 with null body instead of 404" },
                } },
        };
        await col.InsertManyAsync(items);
    }

    private static async Task SeedApiChallengesAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<ApiChallenge>("prog_api_challenges");
        if (await col.CountDocumentsAsync(FilterDefinition<ApiChallenge>.Empty) > 0) return;

        var items = new List<ApiChallenge>
        {
            new() { Domain = "web_dev", Difficulty = 1, TaskDescription = "Get a list of all users",
                CorrectMethod = "GET", CorrectPath = "/api/users", CorrectBody = "", ExpectedStatusCode = 200 },
            new() { Domain = "web_dev", Difficulty = 1, TaskDescription = "Create a new post with title and content",
                CorrectMethod = "POST", CorrectPath = "/api/posts", CorrectBody = "{\"title\":\"\",\"content\":\"\"}", ExpectedStatusCode = 201 },
            new() { Domain = "web_dev", Difficulty = 2, TaskDescription = "Update user with ID 42's email",
                CorrectMethod = "PATCH", CorrectPath = "/api/users/42", CorrectBody = "{\"email\":\"\"}", ExpectedStatusCode = 200 },
            new() { Domain = "web_dev", Difficulty = 2, TaskDescription = "Delete comment with ID 15",
                CorrectMethod = "DELETE", CorrectPath = "/api/comments/15", CorrectBody = "", ExpectedStatusCode = 204 },
            new() { Domain = "backend_systems", Difficulty = 1, TaskDescription = "Get server health status",
                CorrectMethod = "GET", CorrectPath = "/api/health", CorrectBody = "", ExpectedStatusCode = 200 },
            new() { Domain = "backend_systems", Difficulty = 2, TaskDescription = "Upload a file to the storage service",
                CorrectMethod = "POST", CorrectPath = "/api/files/upload", CorrectBody = "", ExpectedStatusCode = 201 },
            new() { Domain = "backend_systems", Difficulty = 3, TaskDescription = "Partially update order #99 status to 'shipped'",
                CorrectMethod = "PATCH", CorrectPath = "/api/orders/99", CorrectBody = "{\"status\":\"shipped\"}", ExpectedStatusCode = 200 },
            new() { Domain = "web_dev", Difficulty = 3, TaskDescription = "Search products by category 'electronics' with pagination (page 2, limit 10)",
                CorrectMethod = "GET", CorrectPath = "/api/products?category=electronics&page=2&limit=10", CorrectBody = "", ExpectedStatusCode = 200 },
        };
        await col.InsertManyAsync(items);
    }
}
