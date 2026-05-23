import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon, Key, Shield, User, Bell, Database,
  Save, CheckCircle, AlertTriangle, ExternalLink, Trash2
} from 'lucide-react';
import type { ApiKeys } from '../types';

export default function Settings() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    try {
      return JSON.parse(localStorage.getItem('fenhack_api_keys') || '{}');
    } catch { return {}; }
  });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'profile' | 'about'>('api');

  const saveKeys = () => {
    localStorage.setItem('fenhack_api_keys', JSON.stringify(apiKeys));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all scan data? This cannot be undone.')) {
      localStorage.removeItem('fenhack_scans');
      window.location.reload();
    }
  };

  const tabs = [
    { id: 'api' as const, icon: Key, label: 'API Keys' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'about' as const, icon: Shield, label: 'About' },
  ];

  return (
    <div className="p-6 space-y-6 fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-[Orbitron] tracking-wider text-white flex items-center gap-3">
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          SETTINGS
        </h1>
        <p className="text-xs font-mono text-gray-500 mt-1">Configure API keys and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-400/10 border border-cyan-400/30 text-cyan-300'
                : 'bg-white/5 border border-white/10 text-gray-500 hover:text-gray-400'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'api' && (
        <div className="space-y-4">
          {/* API Key Info */}
          <div className="glass-panel p-4">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-cyan-400/50 mt-0.5" />
              <div>
                <h3 className="text-sm font-mono font-bold text-gray-300">API Configuration</h3>
                <p className="text-xs font-mono text-gray-600 mt-1">
                  Configure API keys to enable advanced OSINT features. Keys are stored locally in your browser.
                </p>
                <div className="mt-2 p-2 rounded bg-green-400/5 border border-green-400/10">
                  <p className="text-[10px] font-mono text-green-400/70">
                    ✓ Free features (crt.sh, Cloudflare DNS, HackerTarget, Shodan InternetDB) work without API keys.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Shodan */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Database className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-gray-300">Shodan API</h3>
                <p className="text-[10px] font-mono text-gray-600">Full host intelligence, banners, vulnerabilities</p>
              </div>
              <a href="https://account.shodan.io/" target="_blank" rel="noopener noreferrer" className="ml-auto text-cyan-400/50 hover:text-cyan-400">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <input
              type="password"
              value={apiKeys.shodan || ''}
              onChange={e => setApiKeys(prev => ({ ...prev, shodan: e.target.value }))}
              className="w-full cyber-input px-3 py-2 text-sm"
              placeholder="Enter Shodan API key"
            />
          </div>

          {/* Censys */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Database className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-gray-300">Censys API</h3>
                <p className="text-[10px] font-mono text-gray-600">Host and certificate discovery</p>
              </div>
              <a href="https://search.censys.io/register" target="_blank" rel="noopener noreferrer" className="ml-auto text-cyan-400/50 hover:text-cyan-400">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={apiKeys.censysId || ''}
                onChange={e => setApiKeys(prev => ({ ...prev, censysId: e.target.value }))}
                className="cyber-input px-3 py-2 text-sm"
                placeholder="API ID"
              />
              <input
                type="password"
                value={apiKeys.censysSecret || ''}
                onChange={e => setApiKeys(prev => ({ ...prev, censysSecret: e.target.value }))}
                className="cyber-input px-3 py-2 text-sm"
                placeholder="API Secret"
              />
            </div>
          </div>

          {/* HIBP */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-gray-300">Have I Been Pwned</h3>
                <p className="text-[10px] font-mono text-gray-600">Email breach and paste detection</p>
              </div>
              <a href="https://haveibeenpwned.com/API/Key" target="_blank" rel="noopener noreferrer" className="ml-auto text-cyan-400/50 hover:text-cyan-400">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <input
              type="password"
              value={apiKeys.hibp || ''}
              onChange={e => setApiKeys(prev => ({ ...prev, hibp: e.target.value }))}
              className="w-full cyber-input px-3 py-2 text-sm"
              placeholder="Enter HIBP API key"
            />
          </div>

          {/* VirusTotal */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-gray-300">VirusTotal API</h3>
                <p className="text-[10px] font-mono text-gray-600">Domain and IP reputation analysis</p>
              </div>
              <a href="https://www.virustotal.com/gui/join-us" target="_blank" rel="noopener noreferrer" className="ml-auto text-cyan-400/50 hover:text-cyan-400">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <input
              type="password"
              value={apiKeys.virusTotal || ''}
              onChange={e => setApiKeys(prev => ({ ...prev, virusTotal: e.target.value }))}
              className="w-full cyber-input px-3 py-2 text-sm"
              placeholder="Enter VirusTotal API key"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button onClick={saveKeys} className="cyber-btn-success px-6 py-2.5 flex items-center gap-2">
              {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'SAVED!' : 'SAVE API KEYS'}
            </button>
            {saved && (
              <span className="text-xs font-mono text-green-400/70 fade-in">API keys saved securely to browser storage</span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div className="glass-panel p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/20 flex items-center justify-center">
                <User className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{user?.username}</h2>
                <p className="text-xs font-mono text-gray-500">{user?.email}</p>
                <span className="cyber-badge cyber-badge-info mt-1">{user?.role?.toUpperCase()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-black/20">
                <p className="text-[10px] font-mono text-gray-600 uppercase mb-1">Member Since</p>
                <p className="text-xs font-mono text-gray-300">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/20">
                <p className="text-[10px] font-mono text-gray-600 uppercase mb-1">Total Scans</p>
                <p className="text-xs font-mono text-gray-300">{JSON.parse(localStorage.getItem('fenhack_scans') || '[]').length}</p>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-mono font-bold text-gray-300 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400/50" />
              Data Management
            </h3>
            <div className="flex items-center gap-4">
              <button onClick={clearData} className="cyber-btn-danger px-4 py-2 text-xs flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Scan Data
              </button>
              <span className="text-[10px] font-mono text-gray-600">Removes all stored scan results</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="space-y-4">
          <div className="glass-panel-strong p-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-400/5 border border-cyan-400/30 mb-4">
              <Shield className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold font-[Orbitron] tracking-wider text-cyan-300">FENHACK OSINT ENGINE</h2>
            <p className="text-sm font-mono text-cyan-400/50 mt-1">Version 2.0.0</p>
            <p className="text-xs font-mono text-gray-500 mt-4 max-w-md mx-auto">
              A comprehensive Open Source Intelligence platform for cybersecurity professionals, 
              ethical hackers, and security researchers.
            </p>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-sm font-mono font-bold text-gray-300 mb-3">Integrated Data Sources</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { name: 'crt.sh', desc: 'Certificate Transparency', free: true },
                { name: 'Cloudflare DNS', desc: 'DNS over HTTPS', free: true },
                { name: 'HackerTarget', desc: 'DNS, WHOIS, Subdomains', free: true },
                { name: 'Shodan InternetDB', desc: 'Open Ports & Services', free: true },
                { name: 'Shodan API', desc: 'Full Host Intelligence', free: false },
                { name: 'HIBP', desc: 'Breach Detection', free: false },
                { name: 'Censys', desc: 'Host Discovery', free: false },
                { name: 'VirusTotal', desc: 'Reputation Analysis', free: false },
              ].map((source, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-black/20">
                  <div className={`w-2 h-2 rounded-full ${source.free ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <div>
                    <p className="text-xs font-mono text-gray-300">{source.name}</p>
                    <p className="text-[10px] font-mono text-gray-600">{source.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="p-4 rounded-lg bg-yellow-400/5 border border-yellow-400/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400/60 mt-0.5" />
              <div>
                <h3 className="text-sm font-mono font-bold text-yellow-400/80">Legal Disclaimer</h3>
                <p className="text-xs font-mono text-yellow-400/50 mt-1 leading-relaxed">
                  FenHack OSINT Engine is designed for <strong>educational purposes and authorized security testing only</strong>.
                  Users are solely responsible for ensuring they have proper authorization before scanning any target.
                  Unauthorized scanning of systems you do not own or have permission to test is illegal.
                  The developers assume no liability for misuse of this tool.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
