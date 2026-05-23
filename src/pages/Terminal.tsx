import { useState, useRef, useEffect, useCallback } from 'react';
import {
  performFullRecon, enumerateSubdomains, lookupDns, lookupWhois,
  scanPorts, lookupCertificates, checkBreaches, lookupShodan,
  generateReport
} from '../services/osint';
import type { ScanResult } from '../types';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'system';
  text: string;
  timestamp: Date;
}

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', text: '╔══════════════════════════════════════════════════════════════╗', timestamp: new Date() },
    { type: 'system', text: '║           FENHACK OSINT ENGINE - TERMINAL v2.0              ║', timestamp: new Date() },
    { type: 'system', text: '║  For educational and authorized security testing only.      ║', timestamp: new Date() },
    { type: 'system', text: '╚══════════════════════════════════════════════════════════════╝', timestamp: new Date() },
    { type: 'info', text: 'Type "help" for available commands.', timestamp: new Date() },
    { type: 'system', text: '', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    setLines(prev => [...prev, { type, text, timestamp: new Date() }]);
  }, []);

  const addLines = useCallback((type: TerminalLine['type'], texts: string[]) => {
    const newLines = texts.map(t => ({ type, text: t, timestamp: new Date() }));
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const processCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    addLine('input', `fenhack@osint:~$ ${trimmed}`);

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    if (command === 'help') {
      addLines('info', [
        '',
        '  AVAILABLE COMMANDS:',
        '',
        '  scan <target>          Full reconnaissance scan',
        '  subdomains <domain>    Enumerate subdomains',
        '  dns <domain>           DNS intelligence lookup',
        '  whois <domain>         WHOIS information',
        '  ports <host>           Port scan (IP or domain)',
        '  certs <domain>         Certificate transparency lookup',
        '  breach <email>         Check email breaches',
        '  shodan <ip>            Shodan intelligence',
        '  report <scan-id>       Generate report',
        '  clear                  Clear terminal',
        '  about                  About FenHack',
        '  help                   Show this help',
        '',
      ]);
      return;
    }

    if (command === 'about') {
      addLines('info', [
        '',
        '  FENHACK OSINT ENGINE v2.0',
        '  Built for cybersecurity professionals',
        '',
        '  APIs: crt.sh | Cloudflare DoH | HackerTarget | Shodan InternetDB',
        '  Legal: For educational and authorized testing only',
        '',
      ]);
      return;
    }

    if (command === 'clear') {
      setLines([]);
      return;
    }

    if (!arg) {
      addLine('error', `Error: ${command} requires an argument. Type "help" for usage.`);
      return;
    }

    setBusy(true);

    try {
      switch (command) {
        case 'scan': {
          addLine('info', `[*] Initiating full reconnaissance on: ${arg}`);
          addLine('info', '[*] This may take 10-30 seconds...');
          const result = await performFullRecon(arg, 'domain');
          addLine('success', `[+] Scan complete! Risk Score: ${result.riskScore}/100`);
          if (result.results.subdomains?.length) {
            addLine('success', `[+] Subdomains found: ${result.results.subdomains.length}`);
            for (const sub of result.results.subdomains.slice(0, 15)) {
              addLine('output', `    ${sub.domain} ${sub.ip ? '(' + sub.ip + ')' : ''}`);
            }
            if (result.results.subdomains.length > 15) {
              addLine('info', `    ... and ${result.results.subdomains.length - 15} more`);
            }
          } else {
            addLine('info', '[-] No subdomains found');
          }
          if (result.results.dnsRecords?.length) {
            addLine('success', `[+] DNS Records: ${result.results.dnsRecords.length}`);
            for (const r of result.results.dnsRecords.slice(0, 10)) {
              addLine('output', `    ${r.type}: ${r.value}`);
            }
          }
          if (result.results.ports?.length) {
            addLine('success', `[+] Open Ports: ${result.results.ports.length}`);
            for (const p of result.results.ports) {
              addLine('output', `    ${p.port}/${p.service} - ${p.state}`);
            }
          }
          if (result.results.whois) {
            addLine('success', '[+] WHOIS Information:');
            addLine('output', `    Registrar: ${result.results.whois.registrar}`);
            addLine('output', `    Organization: ${result.results.whois.organization}`);
            addLine('output', `    Created: ${result.results.whois.creationDate}`);
          }
          if (result.results.breaches?.length) {
            addLine('error', `[!] BREACHES DETECTED: ${result.results.breaches.length}`);
            for (const b of result.results.breaches) {
              addLine('error', `    [${b.breachName}] ${b.breachDate}`);
            }
          }
          if (result.results.certificates?.length) {
            addLine('success', `[+] Certificates: ${result.results.certificates.length}`);
          }
          addLine('success', '[+] Scan complete.');
          break;
        }

        case 'subdomains': {
          addLine('info', `[*] Enumerating subdomains for: ${arg}`);
          const subs = await enumerateSubdomains(arg);
          if (subs.length > 0) {
            addLine('success', `[+] Found ${subs.length} subdomains:`);
            for (const s of subs) {
              addLine('output', `    ${s.domain} ${s.ip ? '(' + s.ip + ')' : ''} [${s.source}]`);
            }
          } else {
            addLine('info', '[-] No subdomains found');
          }
          break;
        }

        case 'dns': {
          addLine('info', `[*] Looking up DNS records for: ${arg}`);
          const dns = await lookupDns(arg);
          if (dns.length > 0) {
            addLine('success', `[+] Found ${dns.length} DNS records:`);
            for (const r of dns) {
              addLine('output', `    ${r.type}: ${r.value}`);
            }
          } else {
            addLine('info', '[-] No DNS records found');
          }
          break;
        }

        case 'whois': {
          addLine('info', `[*] Performing WHOIS lookup on: ${arg}`);
          const whois = await lookupWhois(arg);
          if (whois) {
            addLine('success', '[+] WHOIS Results:');
            addLine('output', `    Domain: ${whois.domain}`);
            addLine('output', `    Registrar: ${whois.registrar}`);
            addLine('output', `    Organization: ${whois.organization}`);
            addLine('output', `    Created: ${whois.creationDate}`);
            addLine('output', `    Expires: ${whois.expirationDate}`);
            addLine('output', `    Name Servers: ${whois.nameServers.join(', ')}`);
          } else {
            addLine('info', '[-] WHOIS lookup returned no results');
          }
          break;
        }

        case 'ports': {
          addLine('info', `[*] Scanning ports on: ${arg}`);
          const ports = await scanPorts(arg);
          if (ports.length > 0) {
            addLine('success', `[+] Found ${ports.length} open ports:`);
            for (const p of ports) {
              addLine('output', `    ${p.port}/${p.service} - ${p.state}`);
            }
          } else {
            addLine('info', '[-] No open ports found');
          }
          break;
        }

        case 'certs': {
          addLine('info', `[*] Looking up certificates for: ${arg}`);
          const certs = await lookupCertificates(arg);
          if (certs.length > 0) {
            addLine('success', `[+] Found ${certs.length} certificates:`);
            for (const c of certs.slice(0, 20)) {
              addLine('output', `    ${c.commonName} | Issuer: ${c.issuerName}`);
            }
          } else {
            addLine('info', '[-] No certificates found');
          }
          break;
        }

        case 'breach': {
          addLine('info', `[*] Checking breaches for: ${arg}`);
          const breaches = await checkBreaches(arg);
          if (breaches.length > 0) {
            addLine('error', `[!] ${breaches.length} BREACH(ES) DETECTED:`);
            for (const b of breaches) {
              addLine('error', `    [${b.breachName}] ${b.breachDate}`);
              addLine('output', `      Data: ${b.dataClasses.join(', ')}`);
            }
          } else {
            addLine('success', '[+] No breaches found (or HIBP API key not configured)');
          }
          break;
        }

        case 'shodan': {
          addLine('info', `[*] Querying Shodan for: ${arg}`);
          const shodan = await lookupShodan(arg);
          if (shodan) {
            addLine('success', '[+] Shodan Results:');
            addLine('output', `    IP: ${shodan.ip}`);
            addLine('output', `    Ports: ${shodan.ports.join(', ')}`);
            if (shodan.org) addLine('output', `    Organization: ${shodan.org}`);
            if (shodan.os) addLine('output', `    OS: ${shodan.os}`);
            if (shodan.hostnames.length) addLine('output', `    Hostnames: ${shodan.hostnames.join(', ')}`);
            if (shodan.vulns?.length) {
              addLine('error', `    Vulnerabilities: ${shodan.vulns.length}`);
              for (const v of shodan.vulns.slice(0, 10)) {
                addLine('error', `      ${v}`);
              }
            }
          } else {
            addLine('info', '[-] No Shodan data found');
          }
          break;
        }

        default:
          addLine('error', `Unknown command: ${command}. Type "help" for available commands.`);
      }
    } catch (error: any) {
      addLine('error', `[!] Error: ${error.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
      addLine('system', '');
    }
  }, [addLine, addLines]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) {
      processCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const lineColors: Record<string, string> = {
    input: 'text-cyan-300',
    output: 'text-gray-400',
    error: 'text-red-400',
    success: 'text-green-400',
    info: 'text-yellow-400',
    system: 'text-cyan-400/40',
  };

  return (
    <div className="h-full flex flex-col p-4 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-xs font-mono text-gray-600">fenhack@osint:~/terminal</span>
      </div>

      {/* Terminal Body */}
      <div
        ref={termRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 glass-panel overflow-y-auto p-4 font-mono text-xs leading-relaxed"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        {lines.map((line, i) => (
          <div key={i} className={`${lineColors[line.type]} whitespace-pre-wrap break-all`}>
            {line.text}
          </div>
        ))}

        {/* Input Line */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-cyan-400">fenhack@osint:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono text-xs"
            placeholder={busy ? 'Scanning...' : 'Type a command...'}
            autoFocus
          />
          <span className="w-2 h-4 bg-green-400 cursor-blink" />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-4">
          <span className={`text-[10px] font-mono ${busy ? 'text-yellow-400' : 'text-green-400/60'}`}>
            {busy ? '⟳ PROCESSING' : '● READY'}
          </span>
          <span className="text-[10px] font-mono text-gray-700">
            Commands: {history.length}
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-700">
          Type "help" for commands
        </span>
      </div>
    </div>
  );
}
