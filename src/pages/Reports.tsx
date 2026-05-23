import { useState } from 'react';
import { useScan } from '../context/ScanContext';
import { generateReport, exportToCsv } from '../services/osint';
import {
  FileText, Download, Trash2, Search, Shield, Clock,
  ChevronRight, AlertTriangle, Globe, Wifi, Lock, CheckCircle
} from 'lucide-react';

export default function Reports() {
  const { scans, currentScan } = useScan();
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredScans = scans.filter(s =>
    s.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeScan = selectedScan ? scans.find(s => s.id === selectedScan) : null;

  const exportReport = (scan: any, format: 'text' | 'json' | 'csv') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'text') {
      content = generateReport(scan);
      filename = `fenhack-report-${scan.target}.txt`;
      mimeType = 'text/plain';
    } else if (format === 'json') {
      content = JSON.stringify(scan, null, 2);
      filename = `fenhack-report-${scan.target}.json`;
      mimeType = 'application/json';
    } else {
      content = exportToCsv(scan);
      filename = `fenhack-report-${scan.target}.csv`;
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

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-[Orbitron] tracking-wider text-white flex items-center gap-3">
            <FileText className="w-5 h-5 text-cyan-400" />
            REPORTS
          </h1>
          <p className="text-xs font-mono text-gray-500 mt-1">{scans.length} scan reports available</p>
        </div>
      </div>

      {/* Search */}
      <div className="glass-panel p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full cyber-input pl-10 pr-4 py-2.5 text-sm"
            placeholder="Search reports by target..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-1 space-y-2">
          {filteredScans.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-gray-600">
                {scans.length === 0 ? 'No reports yet' : 'No matching reports'}
              </p>
              <p className="text-xs font-mono text-gray-700 mt-1">
                Run scans to generate reports
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredScans.map(scan => (
                <button
                  key={scan.id}
                  onClick={() => setSelectedScan(scan.id)}
                  className={`w-full text-left glass-panel p-3 hover:border-cyan-400/20 transition-all ${
                    selectedScan === scan.id ? 'border-cyan-400/30 bg-cyan-400/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono font-medium text-gray-300">{scan.target}</span>
                    <span className={`cyber-badge ${
                      scan.riskScore > 60 ? 'cyber-badge-critical' :
                      scan.riskScore > 30 ? 'cyber-badge-high' :
                      'cyber-badge-low'
                    }`}>
                      {scan.riskScore}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(scan.timestamp).toLocaleDateString()}
                    </span>
                    <span className="uppercase">{scan.targetType}</span>
                    <span className={`flex items-center gap-1 ${
                      scan.status === 'completed' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        scan.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {scan.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Report Detail */}
        <div className="lg:col-span-2">
          {activeScan ? (
            <div className="space-y-4">
              {/* Report Header */}
              <div className="glass-panel-strong p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold font-mono text-white">{activeScan.target}</h2>
                    <p className="text-xs font-mono text-gray-500 mt-1">
                      Scanned: {new Date(activeScan.timestamp).toLocaleString()} | Type: {activeScan.targetType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => exportReport(activeScan, 'text')} className="cyber-btn px-3 py-1.5 text-[10px] flex items-center gap-1">
                      <Download className="w-3 h-3" /> TXT
                    </button>
                    <button onClick={() => exportReport(activeScan, 'json')} className="cyber-btn px-3 py-1.5 text-[10px] flex items-center gap-1">
                      <Download className="w-3 h-3" /> JSON
                    </button>
                    <button onClick={() => exportReport(activeScan, 'csv')} className="cyber-btn px-3 py-1.5 text-[10px] flex items-center gap-1">
                      <Download className="w-3 h-3" /> CSV
                    </button>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="mt-4 p-4 rounded-lg bg-black/20 border border-cyan-400/5">
                  <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase mb-2">AI Intelligence Summary</h3>
                  <p className="text-xs font-mono text-gray-400 leading-relaxed">
                    {generateSummary(activeScan)}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Globe, label: 'Subdomains', value: activeScan.subdomains.length },
                  { icon: Wifi, label: 'DNS Records', value: activeScan.dnsRecords.length },
                  { icon: Lock, label: 'Open Ports', value: activeScan.ports.length },
                  { icon: AlertTriangle, label: 'Breaches', value: activeScan.breaches.length },
                ].map((stat, i) => (
                  <div key={i} className="glass-panel p-3 text-center">
                    <stat.icon className="w-4 h-4 text-cyan-400/50 mx-auto mb-1" />
                    <p className="text-lg font-bold font-[Orbitron] text-white">{stat.value}</p>
                    <p className="text-[10px] font-mono text-gray-600 uppercase">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Findings */}
              <div className="glass-panel p-4">
                <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase mb-3">Key Findings</h3>
                <div className="space-y-2">
                  {activeScan.ports.length > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded bg-black/20">
                      <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-mono text-gray-300">
                          {activeScan.ports.length} open port(s) detected: {activeScan.ports.map(p => p.port).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  {activeScan.subdomains.length > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded bg-black/20">
                      <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-mono text-gray-300">
                        {activeScan.subdomains.length} subdomain(s) discovered
                      </p>
                    </div>
                  )}
                  {activeScan.breaches.length > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded bg-red-400/5 border border-red-400/10">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-mono text-red-300">
                        {activeScan.breaches.length} breach(es) detected!
                      </p>
                    </div>
                  )}
                  {activeScan.whois && (
                    <div className="flex items-start gap-2 p-2 rounded bg-black/20">
                      <Shield className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-mono text-gray-300">
                        WHOIS: Registered via {activeScan.whois.registrar} by {activeScan.whois.organization}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="glass-panel p-4">
                <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {generateRecommendations(activeScan).map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-black/20">
                      <ChevronRight className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-mono text-gray-400">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center">
              <FileText className="w-16 h-16 text-gray-800 mx-auto mb-3" />
              <p className="text-sm font-mono text-gray-600">Select a report to view</p>
              <p className="text-xs font-mono text-gray-700 mt-1">Click on any scan from the list</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateSummary(scan: any): string {
  const parts: string[] = [];
  parts.push(`Reconnaissance scan of ${scan.target} (${scan.targetType}) completed on ${new Date(scan.timestamp).toLocaleString()}.`);

  if (scan.subdomains.length > 0) {
    parts.push(`Discovered ${scan.subdomains.length} subdomain(s) through certificate transparency and DNS enumeration.`);
  }

  if (scan.dnsRecords.length > 0) {
    const types = [...new Set(scan.dnsRecords.map((r: any) => r.type))];
    parts.push(`DNS analysis revealed ${scan.dnsRecords.length} record(s) across ${types.length} record types (${types.join(', ')}).`);
  }

  if (scan.ports.length > 0) {
    const dangerous = scan.ports.filter((p: any) => [22, 23, 445, 3389, 5900, 6379, 9200, 27017].includes(p.port));
    parts.push(`Port scanning identified ${scan.ports.length} open service(s).`);
    if (dangerous.length > 0) {
      parts.push(`WARNING: ${dangerous.length} potentially sensitive service(s) exposed: ${dangerous.map((p: any) => p.port + '/' + p.service).join(', ')}.`);
    }
  }

  if (scan.breaches.length > 0) {
    parts.push(`CRITICAL: ${scan.breaches.length} data breach(es) detected involving this target.`);
  }

  parts.push(`Overall risk assessment: ${scan.riskScore}/100 (${scan.riskScore > 60 ? 'CRITICAL' : scan.riskScore > 30 ? 'MODERATE' : 'LOW'}).`);

  return parts.join(' ');
}

function generateRecommendations(scan: any): string[] {
  const recs: string[] = [];

  if (scan.ports.length > 0) {
    const dangerous = scan.ports.filter((p: any) => [23, 445, 3389, 5900].includes(p.port));
    if (dangerous.length > 0) {
      recs.push('Immediately close or restrict access to sensitive management ports (Telnet, SMB, RDP, VNC)');
    }
    recs.push('Implement firewall rules to limit exposed services to only those required');
    recs.push('Enable intrusion detection/prevention systems (IDS/IPS)');
  }

  if (scan.subdomains.length > 5) {
    recs.push('Review and consolidate subdomains - each is a potential attack vector');
  }

  if (scan.breaches.length > 0) {
    recs.push('Rotate all credentials associated with this target immediately');
    recs.push('Enable multi-factor authentication (MFA) on all accounts');
  }

  if (scan.dnsRecords.length > 0) {
    recs.push('Implement DNSSEC to prevent DNS spoofing attacks');
  }

  recs.push('Establish regular security monitoring and vulnerability scanning schedule');
  recs.push('Maintain an inventory of all internet-facing assets');

  return recs;
}
