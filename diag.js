const http = require('http');

async function execute() {
  console.log("Fetching groups...");
  // 1. Get token
  const authPayload = JSON.stringify({ email: "admin@sessionflow.com", password: "AdminPassword123!", role: "Admin", name: "Admin" });
  let req = http.request('http://127.0.0.1:5180/api/auth/register', { method: 'POST', headers: {'Content-Type': 'application/json'} }, res => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', () => {
      // Ignore if exists, just login
      http.request('http://127.0.0.1:5180/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'} }, res2 => {
        let data2 = ''; res2.on('data', c => data2 += c);
        res2.on('end', () => {
          const t = JSON.parse(data2).token;
          if (!t) return console.log("Login fail", res2.statusCode, data2);
          
          // 2. Fetch groups
          http.request('http://127.0.0.1:5180/api/groups', { method: 'GET', headers: {'Authorization': `Bearer ${t}`} }, res3 => {
            let data3 = ''; res3.on('data', c => data3 += c);
            res3.on('end', () => {
              const groups = JSON.parse(data3);
              console.log("Groups:", groups);
              if (!groups.length) return console.log("No groups");
              const gId = groups[0].id;
              
              // 3. Fetch chat
              http.request(`http://127.0.0.1:5180/api/chat/${gId}/messages`, { method: 'GET', headers: {'Authorization': `Bearer ${t}`} }, res4 => {
                 let data4 = ''; res4.on('data', c => data4 += c);
                 res4.on('end', () => console.log("Chat GET:", res4.statusCode, data4));
              }).end();
            });
          }).end();
        });
      }).end(JSON.stringify({ email: "admin@sessionflow.com", password: "AdminPassword123!" }));
    });
  });
  req.end(authPayload);
}
execute();
