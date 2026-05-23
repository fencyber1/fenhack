import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Lock, Eye, EyeOff, AlertTriangle, Zap, Globe, Cpu } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!username || !email || !password) {
          setError('All fields are required');
          return;
        }
        const success = await register(username, email, password);
        if (success) {
          navigate('/dashboard');
        } else {
          setError('Username or email already exists');
        }
      } else {
        if (!username || !password) {
          setError('Username and password are required');
          return;
        }
        const success = await login(username, password);
        if (success) {
          navigate('/dashboard');
        } else {
          setError('Invalid credentials');
        }
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center cyber-grid relative overflow-hidden">
      {/* Background effects */}
      <div className="scanline-overlay" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
      
      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-cyan-400/30 rounded-full neon-pulse" />
      <div className="absolute top-40 right-32 w-1 h-1 bg-purple-400/40 rounded-full neon-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-green-400/30 rounded-full neon-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-400/5 border border-cyan-400/30 mb-4 neon-glow-cyan">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold font-[Orbitron] tracking-wider text-cyan-300 mb-1">FENHACK</h1>
          <p className="text-xs font-mono text-cyan-400/50 tracking-[0.3em] uppercase">OSINT Intelligence Engine</p>
        </div>

        {/* Auth Form */}
        <div className="glass-panel-strong p-6">
          <div className="flex mb-6 rounded-lg overflow-hidden border border-cyan-400/10">
            <button
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-mono font-medium transition-all ${
                !isRegister ? 'bg-cyan-400/10 text-cyan-300' : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-mono font-medium transition-all ${
                isRegister ? 'bg-cyan-400/10 text-cyan-300' : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              REGISTER
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-400/5 border border-red-400/20 text-red-400 text-sm font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full cyber-input pl-10 pr-4 py-2.5 text-sm"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full cyber-input pl-10 pr-4 py-2.5 text-sm"
                    placeholder="Enter email"
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full cyber-input pl-10 pr-10 py-2.5 text-sm"
                  placeholder="Enter password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cyber-btn py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="cyber-spinner" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {isRegister ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: Globe, label: 'Real OSINT' },
            { icon: Shield, label: 'Secure' },
            { icon: Cpu, label: 'AI Powered' },
          ].map((feat, i) => (
            <div key={i} className="glass-panel p-3 text-center">
              <feat.icon className="w-4 h-4 text-cyan-400/50 mx-auto mb-1" />
              <p className="text-[10px] font-mono text-gray-500">{feat.label}</p>
            </div>
          ))}
        </div>

        {/* Legal Notice */}
        <div className="mt-4 p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/10">
          <p className="text-[10px] font-mono text-yellow-400/60 text-center leading-relaxed">
            ⚠️ This tool is for educational and authorized security testing only.
            Unauthorized use against systems you don't own is illegal.
          </p>
        </div>
      </div>
    </div>
  );
}
