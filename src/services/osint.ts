import type {
  SubdomainResult,
  DnsRecord,
  WhoisResult,
  PortResult,
  CertificateResult,
  ShodanResult,
  BreachResult,
  EntityNode,
  EntityEdge,
  ApiKeys,
} from '../types';

function getApiKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem('fenhack_api_keys');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// ============ SUBDOMAIN ENUMERATION ============
export async function enumerateSubdomains(domain: string): Promise<SubdomainResult[]> {
  const results: SubdomainResult[] = [];

  // crt.sh - Certificate Transparency (FREE, no key needed)
  try {
    const resp = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`);
    if (resp.ok) {
      const data = await resp.json();
      const seen = new Set<string>();
      for (const entry of data) {
        const names = entry.name_value.split('\n').map((n: string) => n.trim().toLowerCase());
        for (const name of names) {
          if (!seen.has(name) && name.includes(domain) && !name.startsWith('*')) {
            seen.add(name);
            results.push({ domain: name, source: 'crt.sh' });
          }
        }
      }
    }
  } catch (e) {
    console.warn('crt.sh lookup failed:', e);
  }

  // HackerTarget API (FREE tier)
  try {
    const resp = await fetch(`https://api.hackertarget.com/hostsearch/?q=${domain}`);
    if (resp.ok) {
      const text = await resp.text();
      if (!text.includes('error') && !text.includes('API')) {
        const lines = text.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          const [sub, ip] = line.split(',');
          if (sub && !results.find(r => r.domain === sub.trim())) {
            results.push({ domain: sub.trim(), ip: ip?.trim(), source: 'hackertarget' });
          }
        }
      }
    }
  } catch (e) {
    console.warn('HackerTarget lookup failed:', e);
  }

  return results;
}

// ============ DNS INTELLIGENCE ============
export async function lookupDns(domain: string): Promise<DnsRecord[]> {
  const results: DnsRecord[] = [];

  // Cloudflare DNS-over-HTTPS (FREE, no key needed)
  const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];

  for (const type of recordTypes) {
    try {
      const resp = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`,
        { headers: { Accept: 'application/dns-json' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.Answer) {
          for (const answer of data.Answer) {
            results.push({
              type: answer.type === 1 ? 'A' : answer.type === 28 ? 'AAAA' : answer.type === 15 ? 'MX' : answer.type === 2 ? 'NS' : answer.type === 16 ? 'TXT' : answer.type === 5 ? 'CNAME' : answer.type === 6 ? 'SOA' : type,
              value: answer.data,
              ttl: answer.TTL,
            });
          }
        }
      }
    } catch (e) {
      console.warn(`DNS ${type} lookup failed:`, e);
    }
  }

  // Fallback: HackerTarget DNS lookup
  if (results.length === 0) {
    try {
      const resp = await fetch(`https://api.hackertarget.com/dnslookup/?q=${domain}`);
      if (resp.ok) {
        const text = await resp.text();
        const lines = text.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          const [type, , value] = line.split(/\s+/);
          if (type && value) {
            results.push({ type: type.replace(':', ''), value });
          }
        }
      }
    } catch (e) {
      console.warn('HackerTarget DNS fallback failed:', e);
    }
  }

  return results;
}

// ============ WHOIS LOOKUP ============
export async function lookupWhois(domain: string): Promise<WhoisResult | null> {
  try {
    const resp = await fetch(`https://api.hackertarget.com/whois/?q=${domain}`);
    if (resp.ok) {
      const text = await resp.text();
      if (text.includes('error') || text.includes('API count exceeded')) return null;

      const getLine = (keyword: string) => {
        const line = text.split('\n').find(l => l.toLowerCase().startsWith(keyword.toLowerCase()));
        return line ? line.split(':').slice(1).join(':').trim() : '';
      };

      const getLines = (keyword: string) => {
        return text.split('\n')
          .filter(l => l.toLowerCase().startsWith(keyword.toLowerCase()))
          .map(l => l.split(':').slice(1).join(':').trim());
      };

      return {
        domain,
        registrar: getLine('Registrar') || getLine('Sponsoring Registrar Organization') || 'Unknown',
        organization: getLine('Registrant Organization') || getLine('Organization') || 'Unknown',
        creationDate: getLine('Creation Date') || getLine('Created Date') || 'Unknown',
        expirationDate: getLine('Registry Expiry Date') || getLine('Expiration Date') || 'Unknown',
        nameServers: getLines('Name Server').length > 0 ? getLines('Name Server') : ['Unknown'],
        status: getLines('Domain Status').length > 0 ? getLines('Domain Status') : ['Unknown'],
      };
    }
  } catch (e) {
    console.warn('WHOIS lookup failed:', e);
  }
  return null;
}

// ============ PORT SCANNING (Shodan InternetDB) ============
export async function scanPorts(ipOrDomain: string): Promise<PortResult[]> {
  const results: PortResult[] = [];

  try {
    const resp = await fetch(`https://internetdb.shodan.io/${ipOrDomain}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.ports) {
        for (const port of data.ports) {
          results.push({
            port,
            service: getCommonServiceName(port),
            state: 'open',
          });
        }
      }
    }
  } catch (e) {
    console.warn('Shodan InternetDB lookup failed:', e);
  }

  return results;
}

function getCommonServiceName(port: number): string {
  const services: Record<number, string> = {
    21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
    80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
    993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 3306: 'MySQL',
    3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis',
    8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt', 27017: 'MongoDB',
    9200: 'Elasticsearch', 11211: 'Memcached',
  };
  return services[port] || 'unknown';
}

// ============ SSL CERTIFICATE INTELLIGENCE ============
export async function lookupCertificates(domain: string): Promise<CertificateResult[]> {
  const results: CertificateResult[] = [];

  try {
    const resp = await fetch(`https://crt.sh/?q=${domain}&output=json`);
    if (resp.ok) {
      const data = await resp.json();
      const seen = new Set<string>();
      for (const entry of data.slice(0, 50)) {
        const key = `${entry.issuer_name}-${entry.common_name}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            issuerName: entry.issuer_name,
            commonName: entry.common_name,
            notBefore: entry.not_before,
            notAfter: entry.not_after,
            serialNumber: entry.serial_number,
          });
        }
      }
    }
  } catch (e) {
    console.warn('crt.sh certificate lookup failed:', e);
  }

  return results;
}

// ============ SHODAN INTELLIGENCE ============
export async function lookupShodan(ip: string): Promise<ShodanResult | null> {
  const keys = getApiKeys();

  // Try Shodan API with key first
  if (keys.shodan) {
    try {
      const resp = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${keys.shodan}`);
      if (resp.ok) {
        const data = await resp.json();
        return {
          ip: data.ip_str || ip,
          ports: data.ports || [],
          hostnames: data.hostnames || [],
          os: data.os,
          org: data.org,
          country: data.country_name,
          city: data.city,
          vulns: data.vulns ? Object.keys(data.vulns) : [],
          data: (data.data || []).map((d: any) => ({
            port: d.port,
            banner: d.data?.substring(0, 200) || '',
            product: d.product,
            version: d.version,
          })),
        };
      }
    } catch (e) {
      console.warn('Shodan API lookup failed:', e);
    }
  }

  // Fallback to InternetDB (no key needed)
  try {
    const resp = await fetch(`https://internetdb.shodan.io/${ip}`);
    if (resp.ok) {
      const data = await resp.json();
      return {
        ip,
        ports: data.ports || [],
        hostnames: data.hostnames || [],
        os: data.os,
        org: data.org || data.tags?.join(', '),
        country: '',
        city: '',
        vulns: data.vulns || [],
        data: (data.ports || []).map((port: number) => ({
          port,
          banner: '',
          product: '',
          version: '',
        })),
      };
    }
  } catch (e) {
    console.warn('Shodan InternetDB fallback failed:', e);
  }

  return null;
}

// ============ BREACH INTELLIGENCE ============
export async function checkBreaches(email: string): Promise<BreachResult[]> {
  const results: BreachResult[] = [];
  const keys = getApiKeys();

  // Have I Been Pwned (requires API key)
  if (keys.hibp) {
    try {
      const resp = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`, {
        headers: {
          'hibp-api-key': keys.hibp,
          'user-agent': 'FenHack-OSINT-Engine',
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const breach of data) {
          results.push({
            email,
            breachName: breach.Name,
            breachDate: breach.BreachDate,
            description: breach.Description?.substring(0, 200) || '',
            dataClasses: breach.DataClasses || [],
            isVerified: breach.IsVerified,
          });
        }
      }
    } catch (e) {
      console.warn('HIBP lookup failed:', e);
    }
  }

  // Fallback: breach directory via public APIs
  if (results.length === 0) {
    try {
      await fetch(`https://api.hackertarget.com/nping/?q=${encodeURIComponent(email)}`);
    } catch (e) {
      console.warn('Breach check fallback failed:', e);
    }
  }

  return results;
}

// ============ FULL RECON ============
export async function performFullRecon(target: string, targetType: 'domain' | 'email' | 'ip' | 'username') {
  const nodes: EntityNode[] = [];
  const edges: EntityEdge[] = [];

  const addNode = (node: EntityNode) => {
    if (!nodes.find(n => n.id === node.id)) {
      nodes.push(node);
    }
  };

  const addEdge = (source: string, target: string, relation: string) => {
    if (!edges.find(e => e.source === source && e.target === target && e.relation === relation)) {
      edges.push({ source, target, relation });
    }
  };

  // Main target node
  const mainId = `target-${target}`;
  const nodeTypeMap: Record<string, EntityNode['type']> = {
    domain: 'domain', email: 'email', ip: 'ip', username: 'domain',
  };
  addNode({ id: mainId, label: target, type: nodeTypeMap[targetType] || 'domain' });

  const results: any = {};

  if (targetType === 'domain') {
    // Subdomains
    results.subdomains = await enumerateSubdomains(target);
    for (const sub of results.subdomains) {
      const subId = `sub-${sub.domain}`;
      addNode({ id: subId, label: sub.domain, type: 'subdomain' });
      addEdge(mainId, subId, 'CONNECTED_TO');
      if (sub.ip) {
        const ipId = `ip-${sub.ip}`;
        addNode({ id: ipId, label: sub.ip, type: 'ip' });
        addEdge(subId, ipId, 'HOSTED_ON');
      }
    }

    // DNS
    results.dnsRecords = await lookupDns(target);
    for (const record of results.dnsRecords) {
      if (record.type === 'NS') {
        const nsId = `ns-${record.value}`;
        addNode({ id: nsId, label: record.value, type: 'nameserver' });
        addEdge(mainId, nsId, 'CONNECTED_TO');
      }
      if (record.type === 'A' || record.type === 'AAAA') {
        const ipId = `ip-${record.value}`;
        addNode({ id: ipId, label: record.value, type: 'ip' });
        addEdge(mainId, ipId, 'HOSTED_ON');
      }
      if (record.type === 'MX') {
        const mxId = `mx-${record.value}`;
        addNode({ id: mxId, label: record.value, type: 'domain' });
        addEdge(mainId, mxId, 'CONNECTED_TO');
      }
    }

    // WHOIS
    results.whois = await lookupWhois(target);

    // Certificates
    results.certificates = await lookupCertificates(target);
    for (const cert of results.certificates.slice(0, 10)) {
      const certId = `cert-${cert.commonName}`;
      addNode({ id: certId, label: cert.commonName, type: 'certificate' });
      addEdge(mainId, certId, 'EXPOSES');
    }

    // Try to resolve domain to IP for port scan
    const aRecord = results.dnsRecords.find((r: DnsRecord) => r.type === 'A');
    if (aRecord) {
      results.ports = await scanPorts(aRecord.value);
      results.shodan = await lookupShodan(aRecord.value);
      if (results.shodan?.vulns && results.shodan.vulns.length > 0) {
        for (const vuln of results.shodan.vulns) {
          const vulnId = `vuln-${vuln}`;
          addNode({ id: vulnId, label: vuln, type: 'breach' });
          addEdge(`ip-${aRecord.value}`, vulnId, 'EXPOSES');
        }
      }
    }
  }

  if (targetType === 'ip') {
    addNode({ id: mainId, label: target, type: 'ip' });
    results.ports = await scanPorts(target);
    results.shodan = await lookupShodan(target);

    if (results.shodan?.hostnames) {
      for (const hostname of results.shodan.hostnames) {
        const hostId = `sub-${hostname}`;
        addNode({ id: hostId, label: hostname, type: 'subdomain' });
        addEdge(mainId, hostId, 'HOSTED_ON');
      }
    }
  }

  if (targetType === 'email') {
    results.breaches = await checkBreaches(target);
    const emailId = `email-${target}`;
    addNode({ id: emailId, label: target, type: 'email' });
    for (const breach of results.breaches) {
      const breachId = `breach-${breach.breachName}`;
      addNode({ id: breachId, label: breach.breachName, type: 'breach' });
      addEdge(emailId, breachId, 'LEAKED_IN');
    }

    // Also check domain part
    const domain = target.split('@')[1];
    if (domain) {
      const domainId = `target-${domain}`;
      addNode({ id: domainId, label: domain, type: 'domain' });
      addEdge(emailId, domainId, 'CONNECTED_TO');
    }
  }

  // Calculate risk score
  let riskScore = 0;
  if (results.ports) riskScore += Math.min(results.ports.length * 5, 30);
  if (results.breaches) riskScore += Math.min(results.breaches.length * 10, 40);
  if (results.subdomains) riskScore += Math.min(results.subdomains.length * 2, 20);
  if (results.shodan?.vulns) riskScore += Math.min(results.shodan.vulns.length * 5, 20);
  // Bonus for dangerous ports
  if (results.ports) {
    const dangerousPorts = [22, 23, 445, 3389, 5900, 6379, 9200, 27017];
    for (const port of results.ports) {
      if (dangerousPorts.includes(port.port)) riskScore += 3;
    }
  }
  riskScore = Math.min(riskScore, 100);

  return {
    results,
    entityNodes: nodes,
    entityEdges: edges,
    riskScore,
  };
}

// ============ HELPERS ============
export function generateReport(scanData: any): string {
  const lines: string[] = [];
  lines.push('═══════════════════════════════════════════════════');
  lines.push('           FENHACK OSINT ENGINE - REPORT           ');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Target: ${scanData.target}`);
  lines.push(`Date: ${new Date(scanData.timestamp).toLocaleString()}`);
  lines.push(`Risk Score: ${scanData.riskScore}/100`);
  lines.push('');

  if (scanData.results?.subdomains?.length) {
    lines.push('── SUBDOMAINS ──────────────────────────────');
    for (const sub of scanData.results.subdomains) {
      lines.push(`  ${sub.domain} ${sub.ip ? `(${sub.ip})` : ''} [${sub.source}]`);
    }
    lines.push('');
  }

  if (scanData.results?.dnsRecords?.length) {
    lines.push('── DNS RECORDS ─────────────────────────────');
    for (const r of scanData.results.dnsRecords) {
      lines.push(`  ${r.type}: ${r.value}`);
    }
    lines.push('');
  }

  if (scanData.results?.ports?.length) {
    lines.push('── OPEN PORTS ──────────────────────────────');
    for (const p of scanData.results.ports) {
      lines.push(`  ${p.port}/${p.service} - ${p.state}`);
    }
    lines.push('');
  }

  if (scanData.results?.breaches?.length) {
    lines.push('── BREACHES ────────────────────────────────');
    for (const b of scanData.results.breaches) {
      lines.push(`  [${b.breachName}] ${b.breachDate} - ${b.dataClasses.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════');
  lines.push('  Generated by FenHack OSINT Engine               ');
  lines.push('  For educational and authorized testing only.     ');
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}

export function exportToCsv(scanData: any): string {
  const rows: string[][] = [];
  rows.push(['Category', 'Key', 'Value', 'Extra']);

  if (scanData.results?.subdomains) {
    for (const s of scanData.results.subdomains) {
      rows.push(['Subdomain', s.domain, s.ip || '', s.source]);
    }
  }
  if (scanData.results?.dnsRecords) {
    for (const d of scanData.results.dnsRecords) {
      rows.push(['DNS', d.type, d.value, `TTL: ${d.ttl || ''}`]);
    }
  }
  if (scanData.results?.ports) {
    for (const p of scanData.results.ports) {
      rows.push(['Port', String(p.port), p.service, p.state]);
    }
  }
  if (scanData.results?.breaches) {
    for (const b of scanData.results.breaches) {
      rows.push(['Breach', b.breachName, b.breachDate, b.dataClasses.join('; ')]);
    }
  }

  return rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
}
