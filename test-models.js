const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyASk5S2C8rNLjnZjLp3d_ksFp8HLDQ86ug");

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("test");
    const response = await result.response;
    console.log("RESPONSE:", response.text());
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}

listModels();
