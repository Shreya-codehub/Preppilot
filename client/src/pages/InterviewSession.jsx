import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Voice Mode State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [metrics, setMetrics] = useState({ wpm: 0, fillers: 0 });
  const recognitionRef = useRef(null);

  useEffect(() => {
    fetchSessionDetails();
    setupSpeechRecognition();
    setStartTime(Date.now());
  }, [id]);

  const fetchSessionDetails = async () => {
    try {
      const { data } = await API.get(`/interview/${id}`);
      setSession(data.session);
      if (data.session.status === 'completed') {
        setIsCompleted(true);
      }
    } catch (err) {
      alert('Failed to load interview session.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setUserAnswer((prev) => prev + ' ' + transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  };

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      calculateMetrics(userAnswer);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const calculateMetrics = (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const minutesElapsed = (Date.now() - startTime) / 60000 || 0.5;
    const wpm = Math.round(words.length / minutesElapsed);

    const fillerWordsRegex = /\b(um|uh|like|basically|you know|sort of)\b/gi;
    const matches = text.match(fillerWordsRegex);
    const fillers = matches ? matches.length : 0;

    setMetrics({ wpm: isNaN(wpm) ? 0 : wpm, fillers });
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    calculateMetrics(userAnswer);
    setSubmitting(true);
    const currentQ = session.questions[currentQuestionIndex];

    try {
      const { data } = await API.post(`/interview/${id}/answer`, {
        questionId: currentQ._id,
        userAnswer,
      });

      setFeedbackData(data.feedback);
      const updatedQuestions = [...session.questions];
      updatedQuestions[currentQuestionIndex] = data.question;
      setSession({ ...session, questions: updatedQuestions });
    } catch (err) {
      alert('Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    setUserAnswer('');
    setFeedbackData(null);
    setStartTime(Date.now());

    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Final question completed -> Call complete endpoint
      try {
        await API.post(`/interview/${id}/complete`);
        setIsCompleted(true);
      } catch (err) {
        alert('Failed to finalize interview session.');
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading interview...</div>;
  }

  if (!session || !session.questions || session.questions.length === 0) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">No questions found for this session.</div>;
  }

  // --- POST-INTERVIEW SUMMARY VIEW ---
  if (isCompleted) {
    // Calculate overall average score if feedback contains scores
    const scores = session.questions.map((q) => {
      const match = q.feedback?.match(/Score:\s*(\d+)/i);
      return match ? parseInt(match[1], 10) : 7; // default fallback score out of 10
    });
    const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) : 75;

    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 flex flex-col justify-between">
        <div className="max-w-4xl w-full mx-auto flex justify-between items-center pb-4 border-b border-slate-800">
          <h1 className="text-xl font-bold !text-indigo-400">PrepPilot Interview Summary</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition"
          >
            Return to Dashboard
          </button>
        </div>

        <div className="max-w-4xl w-full mx-auto my-8 space-y-6">
          {/* Score Banner */}
          <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-500/30 p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Session Completed Successfully
              </span>
              <h2 className="text-2xl md:text-3xl font-bold !text-white mt-3">{session.targetRole} Mock Review</h2>
              <p className="text-sm text-slate-400 mt-1">Interview Type: {session.interviewType} • {session.questions.length} Questions Answered</p>
            </div>
            <div className="text-center bg-slate-950/80 border border-slate-800 px-6 py-4 rounded-xl">
              <span className="text-xs text-slate-400 block mb-1 font-medium">Readiness Score</span>
              <span className="text-4xl font-extrabold !text-indigo-400">{avgScore}<span className="text-lg text-slate-400">/100</span></span>
            </div>
          </div>
          {/* Extracted Resume Skills Pill Section */}
          {session.extractedSkills && session.extractedSkills.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">
                Skills Analyzed from Your Resume
              </h3>
              <div className="flex flex-wrap gap-2">
                {session.extractedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-lg"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question Breakdown List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold !text-white">Detailed Question & Feedback Review</h3>
            {session.questions.map((q, idx) => (
              <div key={q._id || idx} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-sm font-semibold !text-indigo-300">Q{idx + 1}: {q.questionText}</h4>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 whitespace-nowrap">{q.difficulty || 'Medium'}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-lg text-xs text-slate-300">
                  <strong className="text-slate-400 block mb-1">Your Answer:</strong>
                  {q.userAnswer || 'No answer recorded.'}
                </div>
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-lg text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  <strong className="text-indigo-300 block mb-1">AI Evaluation:</strong>
                  {q.feedback || 'Pending evaluation.'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500">
          PrepPilot AI Mock Interview System • Powered by Google Gemini
        </div>
      </div>
    );
  }

  // --- ACTIVE INTERVIEW QUESTION VIEW ---
  const currentQ = session.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 flex flex-col justify-between">
      {/* Header */}
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold !text-indigo-400">{session.targetRole} Mock Interview</h1>
          <p className="text-xs text-slate-400 mt-0.5">Type: {session.interviewType}</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs transition"
        >
          Exit to Dashboard
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto my-auto py-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Question {currentQuestionIndex + 1} of {session.questions.length}
          </span>
          <span className="text-xs text-slate-400">Difficulty: {currentQ.difficulty || 'Medium'}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl shadow-lg mb-6">
          <h2 className="text-xl md:text-2xl font-semibold mb-6 !text-white leading-relaxed">
            {currentQ.questionText}
          </h2>

          {!feedbackData && !currentQ.feedback ? (
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-slate-300 font-medium">Your Answer:</label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceRecording}
                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                        isListening 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {isListening ? '🔴 Stop Voice Mic' : '🎙️ Answer with Voice'}
                    </button>
                  )}
                </div>
                <textarea
                  rows="5"
                  required
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your structured technical answer or click 'Answer with Voice' to speak..."
                  className="w-full p-4 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm resize-none !text-white"
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Evaluating with Gemini AI...' : 'Submit Answer'}
                </button>
                <span className="text-xs text-slate-400">
                  Topic: <strong className="text-slate-300">{currentQ.topic || 'General Technical'}</strong>
                </span>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700">
                <p className="text-xs font-semibold text-slate-400 mb-1">Your Submitted Answer:</p>
                <p className="text-sm text-slate-200">{currentQ.userAnswer}</p>
                <div className="mt-3 pt-3 border-t border-slate-700 flex gap-4 text-xs text-indigo-300 font-medium">
                  <span>⚡ Speaking Rate: ~{metrics.wpm} WPM</span>
                  <span>⚠️ Filler Words Detected: {metrics.fillers}</span>
                </div>
              </div>

              <div className="p-5 bg-indigo-950/40 border border-indigo-500/30 rounded-lg">
                <h3 className="text-sm font-semibold !text-indigo-300 mb-2 flex items-center gap-2">
                  🤖 Gemini AI Feedback & Evaluation
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{feedbackData || currentQ.feedback}</p>
              </div>

              <button
                onClick={handleNextQuestion}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition text-sm"
              >
                {currentQuestionIndex < session.questions.length - 1 ? 'Next Question →' : 'Complete Interview & View Summary Scorecard'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500">
        PrepPilot AI Mock Interview System • Powered by Google Gemini
      </div>
    </div>
  );
}