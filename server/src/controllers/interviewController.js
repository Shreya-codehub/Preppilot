const Session = require('../middleware/models/Session');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
const { generateInterviewQuestions, evaluateAnswer } = require('../services/geminiService'); 

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// @desc    Upload resume, parse PDF, call Gemini, and create a new interview session
// @route   POST /api/interview/start
exports.startInterviewSession = async (req, res) => {
  try {
    const { targetRole, interviewType, jobDescription } = req.body;
    const resumeFile = req.file;

    if (!targetRole) {
      return res.status(400).json({ message: 'Target role is required' });
    }

    if (!resumeFile) {
      return res.status(400).json({ message: 'Please upload a PDF resume' });
    }

    // 1. Extract text from the uploaded PDF buffer
    const pdfData = await pdfParse(resumeFile.buffer);
    const resumeText = pdfData.text;

    // 2. Call Gemini to analyze resume/JD and generate questions
    const aiResult = await generateInterviewQuestions(
      resumeText,
      jobDescription || 'Standard industry expectations for this role.',
      targetRole,
      interviewType || 'Technical'
    );

    // 3. Create a new session in MongoDB
    const session = await Session.create({
      user: req.user._id,
      targetRole,
      interviewType: interviewType || 'Technical',
      jobDescription: jobDescription || '',
      resumeSnapshot: resumeText.substring(0, 3000), // Save first 3000 chars as snapshot
      extractedSkills: aiResult.extractedSkills || [],
      questions: aiResult.questions.map((q) => ({
        questionText: q.questionText,
        topic: q.topic,
        difficulty: q.difficulty || 'Medium',
      })),
      status: 'in-progress',
    });

    res.status(201).json({
      message: 'Interview session created successfully!',
      sessionId: session._id,
      extractedSkills: session.extractedSkills,
      totalQuestions: session.questions.length,
      firstQuestion: session.questions[0],
    });
  } catch (error) {
    console.error('Start Interview Error:', error);
    res.status(500).json({ message: 'Server error starting interview', error: error.message });
  }
};

// 2. GET /api/interview/:id - Get specific session details
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id, // Ensure user owns this session
    });

    if (!session) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. POST /api/interview/:id/answer - Submit answer & get AI feedback
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, userAnswer } = req.body;

    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    // Find the specific question inside the session
    const question = session.questions.id(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found in this session' });
    }

    // Update user answer
    question.userAnswer = userAnswer;

    // Use Gemini service to evaluate the answer structured format
    const evaluation = await evaluateAnswer(session.targetRole, question.questionText, userAnswer);

    // Format feedback text cleanly for display
    const formattedFeedback = `Score: ${evaluation.score}/10\n\nStrengths: ${evaluation.strengths}\n\nImprovements: ${evaluation.improvements}\n\nIdeal Answer: ${evaluation.idealAnswer}`;
    
    question.feedback = formattedFeedback;
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Answer evaluated successfully',
      feedback: formattedFeedback,
      evaluation,
      question,
    });
  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 4. GET /api/interview/history - Get all past sessions for logged-in user
exports.getUserSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Complete interview session & calculate overall readiness score
// @route   POST /api/interview/:id/complete
exports.completeInterviewSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    // Mark session as completed
    session.status = 'completed';
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Interview completed successfully',
      session,
    });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};