import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/authContext';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states for starting a new interview
  const [targetRole, setTargetRole] = useState('');
  const [interviewType, setInterviewType] = useState('Technical');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data } = await API.get('/interview/history');
      setSessions(data.sessions || []);
    } catch (err) {
      setError('Failed to load past interview history.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      alert('Please select a PDF resume file.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('targetRole', targetRole);
    formData.append('interviewType', interviewType);
    formData.append('jobDescription', jobDescription);
    formData.append('resume', resumeFile);

    try {
      const { data } = await API.post('/interview/start', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/interview/${data.sessionId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate interview questions.');
      setSubmitting(false);
    }
  };

  // Compute stats for dashboard header
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  
  // Calculate average score across completed sessions if available
  const scores = sessions.map((s) => {
    if (!s.questions) return null;
    const qScores = s.questions.map(q => {
      const match = q.feedback?.match(/Score:\s*(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    }).filter(Boolean);
    if (qScores.length === 0) return null;
    return Math.round((qScores.reduce((a, b) => a + b, 0) / qScores.length) * 10);
  }).filter(Boolean);

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      {/* Top Header */}
      <div className="flex justify-between items-center max-w-6xl mx-auto mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold !text-white">PrepPilot Dashboard</h1>
          <p className="text-slate-300 mt-1">Welcome back, {user?.name || user?.email || 'Candidate'}!</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-sm transition"
        >
          Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Sessions</p>
              <h3 className="text-2xl font-bold !text-white mt-1">{totalSessions}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">📁</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Completed Interviews</p>
              <h3 className="text-2xl font-bold !text-white mt-1">{completedSessions}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">✅</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Avg Readiness Score</p>
              <h3 className="text-2xl font-bold !text-indigo-400 mt-1">{avgScore}<span className="text-xs text-slate-400">/100</span></h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">🎯</div>
          </div>
        </div>

        {/* Main Grid: Form + History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Start New Interview Form */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-indigo-300">Start New Mock Interview</h2>
            
            <form onSubmit={handleStartInterview} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Target Role</label>
                <input
                  type="text"
                  required
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Full Stack MERN Developer"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm !text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Interview Type</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm !text-white"
                >
                  <option value="Technical">Technical</option>
                  <option value="Behavioral">Behavioral</option>
                  <option value="System Design">System Design</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Job Description (Optional)</label>
                <textarea
                  rows="3"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste key requirements..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm resize-none !text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Upload Resume (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  required
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition disabled:opacity-50 text-sm"
              >
                {submitting ? 'Parsing & Generating AI Questions...' : 'Start AI Interview'}
              </button>
            </form>
          </div>

          {/* Right Column: Past Sessions History */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-indigo-300">Your Interview History</h2>

            {loading ? (
              <p className="text-slate-400 text-sm">Loading sessions...</p>
            ) : error ? (
              <p className="text-red-400 text-sm">{error}</p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm mb-2">No interview sessions found.</p>
                <p className="text-slate-500 text-xs">Fill out the form on the left and upload your resume to start your first session!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const isCompleted = session.status === 'completed';
                  return (
                    <div
                      key={session._id}
                      onClick={() => navigate(`/interview/${session._id}`)}
                      className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 p-4 rounded-lg cursor-pointer transition flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{session.targetRole}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            isCompleted 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {isCompleted ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Type: {session.interviewType} • Questions: {session.questions?.length || 0}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-xs text-slate-400 hidden sm:inline">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                          {isCompleted ? 'View Scorecard →' : 'Resume →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}