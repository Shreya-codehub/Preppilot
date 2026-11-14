const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper function with automatic model fallback
async function callGeminiWithFallback(prompt) {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
  
  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.warn(`Model ${modelName} failed, trying fallback...`, error.message);
      lastError = error;
    }
  }
  throw lastError;
}

exports.generateInterviewQuestions = async (resumeText, jobDescription, targetRole, interviewType) => {
  const prompt = `
    You are an expert technical interviewer and hiring manager.
    Generate 5 tailored interview questions for the target role: "${targetRole}".
    Interview Type: "${interviewType}".
    
    Candidate Resume Summary:
    ${resumeText.substring(0, 2500)}

    Job Description Requirements:
    ${jobDescription}

    Return a JSON object with this exact schema:
    {
      "extractedSkills": ["Skill1", "Skill2", "Skill3", "Skill4"],
      "questions": [
        {
          "questionText": "Clear, specific technical question",
          "topic": "Core domain tag (e.g. React Hooks, MongoDB Aggregation)",
          "difficulty": "Easy/Medium/Hard"
        }
      ]
    }
  `;

  return await callGeminiWithFallback(prompt);
};

exports.evaluateAnswer = async (targetRole, questionText, userAnswer) => {
  const prompt = `
    You are an expert technical interviewer for a ${targetRole} role.
    Evaluate the candidate's answer to the question below.

    Question: "${questionText}"
    Candidate's Answer: "${userAnswer}"

    Provide a structured evaluation in JSON with this exact schema:
    {
      "score": 8, 
      "strengths": "Brief bullet or sentence on what they did well.",
      "improvements": "Brief constructive advice on missing edge cases or depth.",
      "idealAnswer": "A concise, high-impact model answer."
    }
  `;

  return await callGeminiWithFallback(prompt);
};