export interface User {
  id: string;
  username: string;
  email: string;
  role: 'free' | 'pro' | 'admin';
  createdAt: string;
}

export interface TargetInput {
  type: 'domain' | 'email' | 'ip' | 'username';
  value: string;
}

export interface SubdomainResult {
  domain: string;
  ip?: string;
  source: string;
}

export interface DnsRecord {
  type: string;
  value: string;
  ttl?: number;
}

export interface WhoisResult {
  domain: string;
  registrar: string;
  organization: string;
  creationDate: string;
  expirationDate: string;
  nameServers: string[];
  status: string[];
}

export interface PortResult {
  port: number;
  service: string;
  version?: string;
  state: string;
}

export interface BreachResult {
  email: string;
  breachName: string;
  breachDate: string;
  description: string;
  dataClasses: string[];
  isVerified: boolean;
}

export interface CertificateResult {
  issuerName: string;
  commonName: string;
  notBefore: string;
  notAfter: string;
  serialNumber?: string;
}

export interface ShodanResult {
  ip: string;
  ports: number[];
  hostnames: string[];
  os?: string;
  org?: string;
  country?: string;
  city?: string;
  vulns?: string[];
  data: {
    port: number;
    banner: string;
    product?: string;
    version?: string;
  }[];
}

export interface EntityNode {
  id: string;
  label: string;
  type: 'domain' | 'subdomain' | 'ip' | 'email' | 'breach' | 'certificate' | 'nameserver';
}

export interface EntityEdge {
  source: string;
  target: string;
  relation: string;
}

export interface ScanResult {
  id: string;
  target: string;
  targetType: TargetInput['type'];
  timestamp: string;
  subdomains: SubdomainResult[];
  dnsRecords: DnsRecord[];
  whois?: WhoisResult;
  ports: PortResult[];
  certificates: CertificateResult[];
  shodan?: ShodanResult;
  breaches: BreachResult[];
  entityNodes: EntityNode[];
  entityEdges: EntityEdge[];
  riskScore: number;
  status: 'running' | 'completed' | 'error';
  results?: {
    subdomains?: SubdomainResult[];
    dnsRecords?: DnsRecord[];
    whois?: WhoisResult;
    ports?: PortResult[];
    certificates?: CertificateResult[];
    shodan?: ShodanResult;
    breaches?: BreachResult[];
  };
}

export interface Alert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  timestamp: string;
  target?: string;
}

export interface ApiKeys {
  shodan?: string;
  censysId?: string;
  censysSecret?: string;
  hibp?: string;
  virusTotal?: string;
}

export type ScanModule = 'subdomains' | 'dns' | 'whois' | 'ports' | 'certificates' | 'breaches' | 'shodan';
