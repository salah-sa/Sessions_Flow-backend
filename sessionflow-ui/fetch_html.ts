import { MongoClient } from 'mongodb';
import fs from 'fs';

async function run() {
  const uri = "mongodb+srv://salahcsedu:7JOfuHw1o9yGkHq2@cluster0.k5oou.mongodb.net/";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('SessionFlow');
    const settings = database.collection('Settings');
    
    const doc = await settings.findOne({ Key: '3c_last_panel_html' });
    if (doc) {
        fs.writeFileSync('C:/Users/salah/.gemini/antigravity/brain/c0d468a3-c85e-4be5-bc33-9e0dda9f19bd/3c_dump.html', doc.Value);
        console.log("HTML dumped successfully.");
    } else {
        console.log("No HTML document found in DB.");
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
