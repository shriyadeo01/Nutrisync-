const axios = require('axios');
const fs = require('fs');

async function testOpenRouter() {
  const apiKey = "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"; 

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: "hi" }],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "DietAppTest"
        },
      }
    );
    console.log("SUCCESS:", response.data.choices[0].message.content);
  } catch (e) {
    if (e.response) {
      console.log("STATUS:", e.response.status);
      console.log("ERROR DATA:", e.response.data);
    } else {
      console.log("ERROR:", e.message);
    }
  }
}

testOpenRouter();
