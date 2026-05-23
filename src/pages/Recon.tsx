import { useState, useCallback } from 'react';
import { useScan } from '../context/ScanContext';
import { performFullRecon, generateReport, exportToCsv } from '../services/osint';
import {
  Search, Globe, Mail, Hash, Zap, Loader2, ChevronDown, ChevronUp,
  Download, FileText, FileJson, AlertTriangle, Shield, Wifi, Lock,
  CheckCircle, XCircle, ExternalLink
} from 'lucide-react';
import type { ScanModule, TargetInput, ScanResult, PortResult, BreachResult } from '../types';

const targetTypes: { type: TargetInput['type']; icon: any; label: string; placeholder: string }[] = [
  { type: 'domain', icon: Globe, label: 'Domain', placeholder: 'example.com' },
  { type: 'email', icon: Mail, label: 'Email', placeholder: 'user@example.com' },
  { type: 'ip', icon: Wifi, label: 'IP Address', placeholder: '1.2.3.4' },
  { type: 'username', icon: Hash, label: 'Username', placeholder: 'johndoe' },
];

const modules: { id: ScanModule; label: string; description: string; free: boolean }[] = [
  { id: 'subdomains', label: 'Subdomain Enum', description: 'Discover subdomains via crt.sh & HackerTarget', free: true },
  { id: 'dns', label: 'DNS Intelligence', description: 'A, MX, NS, TXT records via Cloudflare DoH', free: true },
  { id: 'whois', label: 'WHOIS Lookup', description: 'Registrar, organization, dates', free: true },
  { id: 'certificates', label: 'SSL Certificates', description: 'Historical certificates via crt.sh', free: true },
  { id: 'ports', label: 'Port Scanning', description: 'Open ports via Shodan InternetDB', free: true },
  { id: 'breaches', label: 'Breach Intel', description: 'Email breach checks (requires HIBP API key)', free: false },
  { id: 'shodan', label: 'Shodan Intel', description: 'Deep service enumeration (requires API key)', free: false },
];

export default function Recon() {
  const [target, setTarget] = useState('');
  const [targetType, setTargetType] = useState<TargetInput['type']>('domain');
  const [selectedModules, setSelectedModules] = useState<ScanModule[]>(['subdomains', 'dns', 'whois', 'certificates', 'ports']);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ subdomains: true, dns: true, ports: true, certs: false, breaches: false, whois: false });
  const { addScan, addAlert } = useScan();

  const toggleModule = (mod: ScanModule) => {
    setSelectedModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const startScan = useCallback(async () => {
    if (!target.trim()) return;
    setScanning(true);
    setProgress(0);
    setScanResult(null);

    const scanId = `scan-${Date.now()}`;
    const scanData: ScanResult = {
      id: scanId,
      target: target.trim(),
      targetType,
      timestamp: new Date().toISOString(),
      subdomains: [],
      dnsRecords: [],
      ports: [],
      certificates: [],
      breaches: [],
      entityNodes: [],
      entityEdges: [],
      riskScore: 0,
      status: 'running',
    };

    addScan(scanData);
    setScanResult(scanData);

    try {
      setProgress(10);

      const result = await performFullRecon(target.trim(), targetType);
      setProgress(80);

      const completedScan: ScanResult = {
        ...scanData,
        subdomains: result.results.subdomains || [],
        dnsRecords: result.results.dnsRecords || [],
        whois: result.results.whois,
        ports: result.results.ports || [],
        certificates: result.results.certificates || [],
        shodan: result.results.shodan,
        breaches: result.results.breaches || [],
        entityNodes: result.entityNodes,
        entityEdges: result.entityEdges,
        riskScore: result.riskScore,
        results: result.results,
        status: 'completed',
      };

      setScanResult(completedScan);
      addScan(completedScan);
      setProgress(100);

      // Generate alerts
      if (result.results.ports?.length > 0) {
        const dangerous = result.results.ports.filter((p: PortResult) => [22, 23, 445, 3389, 5900, 6379, 9200, 27017].includes(p.port));
        if (dangerous.length > 0) {
          addAlert({
            id: `alert-${Date.now()}-1`,
            type: 'critical',
            title: `${dangerous.length} Sensitive Service(s) Exposed`,
            description: `Found open ports: ${dangerous.map(p => `${p.port}/${p.service}`).join(', ')} on ${target.trim()}`,
            timestamp: new Date().toISOString(),
            target: target.trim(),
          });
        }
      }

      if (result.results.breaches?.length > 0) {
        addAlert({
          id: `alert-${Date.now()}-2`,
          type: 'high',
          title: `${result.results.breaches.length} Breach(es) Detected`,
          description: `${target.trim()} found in: ${result.results.breaches.map((b: BreachResult) => b.breachName).join(', ')}`,
          timestamp: new Date().toISOString(),
          target: target.trim(),
        });
      }

      if (result.riskScore > 50) {
        addAlert({
          id: `alert-${Date.now()}-3`,
          type: 'high',
          title: `High Exposure Score: ${result.riskScore}%`,
          description: `${target.trim()} has a significant attack surface`,
          timestamp: new Date().toISOString(),
          target: target.trim(),
        });
      }

    } catch (error: any) {
      const errorScan: ScanResult = { ...scanData, status: 'error' };
      setScanResult(errorScan);
      addScan(errorScan);
      addAlert({
        id: `alert-${Date.now()}-err`,
        type: 'medium',
        title: 'Scan Error',
        description: `Error scanning ${target.trim()}: ${error.message}`,
        timestamp: new Date().toISOString(),
        target: target.trim(),
      });
    } finally {
      setScanning(false);
    }
  }, [target, targetType, addScan, addAlert]);

  const exportReport = (format: 'text' | 'json' | 'csv') => {
    if (!scanResult) return;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'text') {
      content = generateReport(scanResult);
      filename = `fenhack-report-${scanResult.target}.txt`;
      mimeType = 'text/plain';
    } else if (format === 'json') {
      content = JSON.stringify(scanResult, null, 2);
      filename = `fenhack-report-${scanResult.target}.json`;
      mimeType = 'application/json';
    } else {
      content = exportToCsv(scanResult);
      filename = `fenhack-report-${scanResult.target}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentTypeConfig = targetTypes.find(t => t.type === targetType)!;

  return (
    <div className="p-6 space-y-6 fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-[Orbitron] tracking-wider text-white flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400" />
          RECON ENGINE
        </h1>
        <p className="text-xs font-mono text-gray-500 mt-1">Real-time OSINT reconnaissance using public APIs</p>
      </div>

      {/* Target Input */}
      <div className="glass-panel-strong p-6">
        {/* Target Type Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {targetTypes.map(tt => (
            <button
              key={tt.type}
              onClick={() => setTargetType(tt.type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                targetType === tt.type
                  ? 'bg-cyan-400/10 border border-cyan-400/30 text-cyan-300'
                  : 'bg-white/5 border border-white/10 text-gray-500 hover:text-gray-400'
              }`}
            >
              <tt.icon className="w-3.5 h-3.5" />
              {tt.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <currentTypeConfig.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !scanning && startScan()}
              className="w-full cyber-input pl-10 pr-4 py-3 text-sm"
              placeholder={currentTypeConfig.placeholder}
              disabled={scanning}
            />
          </div>
          <button
            onClick={startScan}
            disabled={scanning || !target.trim()}
            className="cyber-btn px-6 py-3 flex items-center gap-2 disabled:opacity-30"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                SCANNING...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                LAUNCH SCAN
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {scanning && (
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-mono text-cyan-400/60">
                {progress < 20 ? 'Resolving target...' :
                 progress < 50 ? 'Enumerating subdomains...' :
                 progress < 70 ? 'Gathering intelligence...' :
                 progress < 90 ? 'Analyzing results...' : 'Complete'}
              </span>
              <span className="text-[10px] font-mono text-cyan-400/60">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full progress-bar-fill transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Module Selection */}
      <div className="glass-panel p-4">
        <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-wider mb-3">Scan Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {modules.map(mod => (
            <button
              key={mod.id}
              onClick={() => toggleModule(mod.id)}
              disabled={scanning}
              className={`flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                selectedModules.includes(mod.id)
                  ? 'bg-cyan-400/5 border border-cyan-400/20'
                  : 'bg-black/20 border border-white/5 opacity-50'
              }`}
            >
              <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 ${
                selectedModules.includes(mod.id)
                  ? 'bg-cyan-400/20 border-cyan-400/50'
                  : 'border-gray-600'
              }`}>
                {selectedModules.includes(mod.id) && (
                  <CheckCircle className="w-3 h-3 text-cyan-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-mono text-gray-300 font-medium">{mod.label}</p>
                <p className="text-[10px] font-mono text-gray-600 mt-0.5">{mod.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {scanResult && scanResult.status === 'completed' && (
        <div className="space-y-4">
          {/* Risk Score */}
          <div className="glass-panel-strong p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center border ${
                scanResult.riskScore > 60 ? 'bg-red-400/10 border-red-400/30' :
                scanResult.riskScore > 30 ? 'bg-yellow-400/10 border-yellow-400/30' :
                'bg-green-400/10 border-green-400/30'
              }`}>
                <span className={`text-2xl font-bold font-[Orbitron] ${
                  scanResult.riskScore > 60 ? 'text-red-400' :
                  scanResult.riskScore > 30 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {scanResult.riskScore}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Risk Score</p>
                <p className="text-xs font-mono text-gray-500">
                  {scanResult.riskScore > 60 ? 'CRITICAL - High exposure detected' :
                   scanResult.riskScore > 30 ? 'MODERATE - Some services exposed' :
                   'LOW - Minimal attack surface'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportReport('text')} className="cyber-btn px-3 py-1.5 text-[10px] flex items-center gap-1">
                <FileText className="w-3 h-3" /> TXT
              </button>
              <button onClick={() => exportReport('json')} className="cyber-btn px-3 py-1.5 text-[10px] flex items-center gap-1">
                <FileJson className="w-3 h-3" /> JSON
              </button>
              <button onClick={() => exportReport('csv')} className="cyber-btn px-3 py-1.5 text-[10px] flex items-center gap-1">
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Subdomains', value: scanResult.subdomains.length, color: 'cyan' },
              { label: 'DNS Records', value: scanResult.dnsRecords.length, color: 'purple' },
              { label: 'Open Ports', value: scanResult.ports.length, color: 'orange' },
              { label: 'Breaches', value: scanResult.breaches.length, color: 'red' },
            ].map((stat, i) => (
              <div key={i} className="glass-panel p-3 text-center">
                <p className="text-lg font-bold font-[Orbitron] text-white">{stat.value}</p>
                <p className="text-[10px] font-mono text-gray-500 uppercase">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Subdomains */}
          {scanResult.subdomains.length > 0 && (
            <ResultSection
              title="Subdomains"
              icon={Globe}
              count={scanResult.subdomains.length}
              expanded={expandedSections.subdomains}
              onToggle={() => toggleSection('subdomains')}
            >
              <table className="cyber-table">
                <thead>
                  <tr><th>Domain</th><th>IP Address</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {scanResult.subdomains.map((sub, i) => (
                    <tr key={i}>
                      <td className="text-cyan-300">{sub.domain}</td>
                      <td className="text-gray-400">{sub.ip || '—'}</td>
                      <td><span className="cyber-badge cyber-badge-info">{sub.source}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResultSection>
          )}

          {/* DNS Records */}
          {scanResult.dnsRecords.length > 0 && (
            <ResultSection
              title="DNS Records"
              icon={Wifi}
              count={scanResult.dnsRecords.length}
              expanded={expandedSections.dns}
              onToggle={() => toggleSection('dns')}
            >
              <table className="cyber-table">
                <thead>
                  <tr><th>Type</th><th>Value</th><th>TTL</th></tr>
                </thead>
                <tbody>
                  {scanResult.dnsRecords.map((record, i) => (
                    <tr key={i}>
                      <td><span className="cyber-badge cyber-badge-info">{record.type}</span></td>
                      <td className="text-gray-300 max-w-md truncate">{record.value}</td>
                      <td className="text-gray-500">{record.ttl || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResultSection>
          )}

          {/* WHOIS */}
          {scanResult.whois && (
            <ResultSection
              title="WHOIS Information"
              icon={Shield}
              count={1}
              expanded={expandedSections.whois}
              onToggle={() => toggleSection('whois')}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                {[
                  { label: 'Registrar', value: scanResult.whois.registrar },
                  { label: 'Organization', value: scanResult.whois.organization },
                  { label: 'Created', value: scanResult.whois.creationDate },
                  { label: 'Expires', value: scanResult.whois.expirationDate },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-lg bg-black/20">
                    <p className="text-[10px] font-mono text-gray-600 uppercase mb-1">{item.label}</p>
                    <p className="text-xs font-mono text-gray-300">{item.value}</p>
                  </div>
                ))}
                <div className="sm:col-span-2 p-3 rounded-lg bg-black/20">
                  <p className="text-[10px] font-mono text-gray-600 uppercase mb-1">Name Servers</p>
                  <div className="flex flex-wrap gap-2">
                    {scanResult.whois.nameServers.map((ns, i) => (
                      <span key={i} className="cyber-badge cyber-badge-info">{ns}</span>
                    ))}
                  </div>
                </div>
              </div>
            </ResultSection>
          )}

          {/* Open Ports */}
          {scanResult.ports.length > 0 && (
            <ResultSection
              title="Open Ports"
              icon={Lock}
              count={scanResult.ports.length}
              expanded={expandedSections.ports}
              onToggle={() => toggleSection('ports')}
            >
              <table className="cyber-table">
                <thead>
                  <tr><th>Port</th><th>Service</th><th>State</th><th>Risk</th></tr>
                </thead>
                <tbody>
                  {scanResult.ports.map((port, i) => {
                    const isDangerous = [22, 23, 445, 3389, 5900, 6379, 9200, 27017, 11211].includes(port.port);
                    return (
                      <tr key={i}>
                        <td className="text-cyan-300 font-bold">{port.port}</td>
                        <td className="text-gray-300">{port.service}</td>
                        <td><span className="cyber-badge cyber-badge-low">{port.state}</span></td>
                        <td>
                          {isDangerous ? (
                            <span className="cyber-badge cyber-badge-critical">HIGH</span>
                          ) : (
                            <span className="cyber-badge cyber-badge-low">LOW</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResultSection>
          )}

          {/* Certificates */}
          {scanResult.certificates.length > 0 && (
            <ResultSection
              title="SSL Certificates"
              icon={Shield}
              count={scanResult.certificates.length}
              expanded={expandedSections.certs}
              onToggle={() => toggleSection('certs')}
            >
              <table className="cyber-table">
                <thead>
                  <tr><th>Common Name</th><th>Issuer</th><th>Not Before</th><th>Not After</th></tr>
                </thead>
                <tbody>
                  {scanResult.certificates.slice(0, 20).map((cert, i) => (
                    <tr key={i}>
                      <td className="text-cyan-300">{cert.commonName}</td>
                      <td className="text-gray-400 max-w-xs truncate">{cert.issuerName}</td>
                      <td className="text-gray-500">{new Date(cert.notBefore).toLocaleDateString()}</td>
                      <td className="text-gray-500">{new Date(cert.notAfter).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResultSection>
          )}

          {/* Breaches */}
          {scanResult.breaches.length > 0 && (
            <ResultSection
              title="Breach Intelligence"
              icon={AlertTriangle}
              count={scanResult.breaches.length}
              expanded={expandedSections.breaches}
              onToggle={() => toggleSection('breaches')}
            >
              <div className="space-y-2 p-2">
                {scanResult.breaches.map((breach, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-400/5 border border-red-400/10">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-mono font-bold text-red-300">{breach.breachName}</span>
                      <span className="text-[10px] font-mono text-gray-500">{breach.breachDate}</span>
                      {breach.isVerified && <CheckCircle className="w-3 h-3 text-green-400" />}
                    </div>
                    {breach.dataClasses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {breach.dataClasses.map((dc, j) => (
                          <span key={j} className="cyber-badge cyber-badge-critical">{dc}</span>
                        ))}
                      </div>
                    )}
                    {breach.description && (
                      <p className="text-[11px] font-mono text-gray-500 mt-1">{breach.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {/* Shodan Data */}
          {scanResult.shodan && (
            <ResultSection
              title="Shodan Intelligence"
              icon={ExternalLink}
              count={scanResult.shodan.ports.length}
              expanded={true}
              onToggle={() => {}}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2">
                {scanResult.shodan.org && (
                  <div className="p-3 rounded-lg bg-black/20">
                    <p className="text-[10px] font-mono text-gray-600 uppercase mb-1">Organization</p>
                    <p className="text-xs font-mono text-gray-300">{scanResult.shodan.org}</p>
                  </div>
                )}
                {scanResult.shodan.country && (
                  <div className="p-3 rounded-lg bg-black/20">
                    <p className="text-[10px] font-mono text-gray-600 uppercase mb-1">Location</p>
                    <p className="text-xs font-mono text-gray-300">{[scanResult.shodan.city, scanResult.shodan.country].filter(Boolean).join(', ')}</p>
                  </div>
                )}
                {scanResult.shodan.os && (
                  <div className="p-3 rounded-lg bg-black/20">
                    <p className="text-[10px] font-mono text-gray-600 uppercase mb-1">Operating System</p>
                    <p className="text-xs font-mono text-gray-300">{scanResult.shodan.os}</p>
                  </div>
                )}
                {scanResult.shodan.hostnames.length > 0 && (
                  <div className="p-3 rounded-lg bg-black/20">
                    <p className="text-[10px] font-mono text-gray-600 uppercase mb-1">Hostnames</p>
                    <div className="flex flex-wrap gap-1">
                      {scanResult.shodan.hostnames.map((h, i) => (
                        <span key={i} className="cyber-badge cyber-badge-info">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {scanResult.shodan.vulns && scanResult.shodan.vulns.length > 0 && (
                <div className="p-2 mt-2">
                  <p className="text-[10px] font-mono text-gray-600 uppercase mb-2">Vulnerabilities ({scanResult.shodan.vulns.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {scanResult.shodan.vulns.slice(0, 20).map((v, i) => (
                      <span key={i} className="cyber-badge cyber-badge-critical">{v}</span>
                    ))}
                  </div>
                </div>
              )}
              {scanResult.shodan.data.length > 0 && (
                <div className="mt-3 p-2">
                  <p className="text-[10px] font-mono text-gray-600 uppercase mb-2">Service Banners</p>
                  <div className="space-y-1">
                    {scanResult.shodan.data.slice(0, 5).map((d, i) => (
                      <div key={i} className="p-2 rounded bg-black/30 font-mono text-[11px] text-gray-400">
                        <span className="text-cyan-400">Port {d.port}</span>
                        {d.product && <span className="text-gray-300 ml-2">{d.product}</span>}
                        {d.version && <span className="text-gray-500 ml-1">v{d.version}</span>}
                        {d.banner && <p className="mt-1 text-gray-600 whitespace-pre-wrap break-all">{d.banner.substring(0, 200)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, icon: Icon, count, expanded, onToggle, children }: {
  title: string;
  icon: any;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-cyan-400/60" />
          <span className="text-sm font-bold font-mono text-gray-300 uppercase">{title}</span>
          <span className="cyber-badge cyber-badge-info">{count}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 overflow-x-auto fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
