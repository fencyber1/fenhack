import { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScan } from '../context/ScanContext';
import {
  Shield, Globe, AlertTriangle, Lock, Search, Zap,
  TrendingUp, Activity, ChevronRight, Clock, Wifi
} from 'lucide-react';
import type { EntityNode, EntityEdge } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { scans, alerts } = useScan();

  // Aggregate stats from all scans
  const stats = useMemo(() => {
    let totalSubdomains = 0;
    let totalPorts = 0;
    let totalBreaches = 0;
    let avgRisk = 0;

    for (const scan of scans) {
      totalSubdomains += scan.results?.subdomains?.length || scan.subdomains?.length || 0;
      totalPorts += scan.results?.ports?.length || scan.ports?.length || 0;
      totalBreaches += scan.results?.breaches?.length || scan.breaches?.length || 0;
    }

    if (scans.length > 0) {
      avgRisk = Math.round(scans.reduce((sum, s) => sum + (s.riskScore || 0), 0) / scans.length);
    }

    return { totalSubdomains, totalPorts, totalBreaches, avgRisk, totalScans: scans.length };
  }, [scans]);

  // Collect all entity nodes and edges from scans
  const graphData = useMemo(() => {
    const nodes: EntityNode[] = [];
    const edges: EntityEdge[] = [];
    const seenNodes = new Set<string>();

    for (const scan of scans.slice(0, 5)) {
      const scanNodes = scan.entityNodes || [];
      const scanEdges = scan.entityEdges || [];
      for (const node of scanNodes) {
        if (!seenNodes.has(node.id)) {
          seenNodes.add(node.id);
          nodes.push(node);
        }
      }
      edges.push(...scanEdges);
    }

    return { nodes, edges };
  }, [scans]);

  const statCards = [
    { icon: Globe, label: 'Assets Discovered', value: stats.totalSubdomains, color: 'cyan' as const, bgColor: 'from-cyan-500/10 to-cyan-400/5', borderColor: 'border-cyan-400/20' },
    { icon: Wifi, label: 'Open Ports', value: stats.totalPorts, color: 'orange' as const, bgColor: 'from-orange-500/10 to-orange-400/5', borderColor: 'border-orange-400/20' },
    { icon: Lock, label: 'Leaked Credentials', value: stats.totalBreaches, color: 'red' as const, bgColor: 'from-red-500/10 to-red-400/5', borderColor: 'border-red-400/20' },
    { icon: Shield, label: 'Exposure Score', value: stats.avgRisk, color: stats.avgRisk > 60 ? 'red' : stats.avgRisk > 30 ? 'yellow' : 'green', bgColor: stats.avgRisk > 60 ? 'from-red-500/10 to-red-400/5' : stats.avgRisk > 30 ? 'from-yellow-500/10 to-yellow-400/5' : 'from-green-500/10 to-green-400/5', borderColor: stats.avgRisk > 60 ? 'border-red-400/20' : stats.avgRisk > 30 ? 'border-yellow-400/20' : 'border-green-400/20' },
  ];

  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-[Orbitron] tracking-wider text-white flex items-center gap-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            COMMAND CENTER
          </h1>
          <p className="text-xs font-mono text-gray-500 mt-1">Real-time OSINT intelligence overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/recon')}
            className="cyber-btn px-4 py-2 text-xs flex items-center gap-2"
          >
            <Search className="w-3.5 h-3.5" />
            New Scan
          </button>
        </div>
      </div>

      {/* Legal Warning */}
      <div className="p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/10 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-400/60 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] font-mono text-yellow-400/60">
          This tool is for <strong className="text-yellow-400/80">educational and authorized security testing only</strong>. 
          Always obtain proper authorization before scanning any target.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`glass-panel p-4 bg-gradient-to-br ${card.bgColor} ${card.borderColor} border`}>
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-5 h-5 ${colorClasses[card.color]}`} />
              <TrendingUp className="w-3 h-3 text-gray-600" />
            </div>
            <p className="text-2xl font-bold font-[Orbitron] text-white">{card.value}</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity Correlation Graph */}
        <div className="lg:col-span-2 glass-panel p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400/50" />
              Entity Correlation Graph
            </h2>
            {graphData.nodes.length === 0 && (
              <span className="text-[10px] font-mono text-gray-600">No scan data yet</span>
            )}
          </div>
          <EntityGraph nodes={graphData.nodes} edges={graphData.edges} />
        </div>

        {/* Alert Panel */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400/50" />
              Alerts
            </h2>
            <span className="text-[10px] font-mono text-gray-600">{alerts.length} active</span>
          </div>
          <AlertList alerts={alerts} />
        </div>
      </div>

      {/* Recent Scans */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400/50" />
            Recent Scans
          </h2>
          <button onClick={() => navigate('/reports')} className="text-xs text-cyan-400/50 hover:text-cyan-400 font-mono flex items-center gap-1">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {scans.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-mono text-gray-600">No scans yet</p>
            <p className="text-xs font-mono text-gray-700 mt-1">Start your first reconnaissance scan</p>
            <button
              onClick={() => navigate('/recon')}
              className="cyber-btn px-4 py-2 text-xs mt-4"
            >
              <Zap className="w-3.5 h-3.5 inline mr-2" />
              Start Scan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Risk</th>
                  <th>Assets</th>
                  <th>Ports</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 10).map((scan) => (
                  <tr key={scan.id}>
                    <td className="text-cyan-300 font-medium">{scan.target}</td>
                    <td><span className="cyber-badge cyber-badge-info">{scan.targetType}</span></td>
                    <td>
                      <span className={`cyber-badge ${
                        scan.riskScore > 60 ? 'cyber-badge-critical' :
                        scan.riskScore > 30 ? 'cyber-badge-high' :
                        scan.riskScore > 10 ? 'cyber-badge-medium' : 'cyber-badge-low'
                      }`}>
                        {scan.riskScore}%
                      </span>
                    </td>
                    <td>{(scan.results?.subdomains?.length || scan.subdomains?.length || 0)}</td>
                    <td>{(scan.results?.ports?.length || scan.ports?.length || 0)}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 text-xs font-mono ${
                        scan.status === 'completed' ? 'text-green-400' :
                        scan.status === 'running' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          scan.status === 'completed' ? 'bg-green-400' :
                          scan.status === 'running' ? 'bg-yellow-400 neon-pulse' : 'bg-red-400'
                        }`} />
                        {scan.status}
                      </span>
                    </td>
                    <td className="text-gray-500">{new Date(scan.timestamp).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Entity Graph Component using SVG
function EntityGraph({ nodes, edges }: { nodes: EntityNode[]; edges: EntityEdge[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { positionedNodes, positionedEdges } = useMemo(() => {
    if (nodes.length === 0) return { positionedNodes: [], positionedEdges: [] };

    // Simple force-directed layout simulation
    const width = 700;
    const height = 350;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const nodePositions = new Map<string, { x: number; y: number }>();
    
    // Place main node at center
    const mainNode = nodes[0];
    nodePositions.set(mainNode.id, { x: centerX, y: centerY });

    // Place connected nodes in circles around center
    const connectedFromCenter = edges
      .filter(e => e.source === mainNode.id || e.target === mainNode.id)
      .map(e => e.source === mainNode.id ? e.target : e.source);

    const otherNodes = nodes.filter(n => n.id !== mainNode.id);
    
    otherNodes.forEach((node, i) => {
      const angle = (i / otherNodes.length) * Math.PI * 2 - Math.PI / 2;
      const isConnected = connectedFromCenter.includes(node.id);
      const r = isConnected ? radius * 0.6 : radius * 0.85;
      nodePositions.set(node.id, {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      });
    });

    const pNodeArray = nodes.map(n => ({
      ...n,
      x: nodePositions.get(n.id)?.x || centerX,
      y: nodePositions.get(n.id)?.y || centerY,
    }));

    const pEdgeArray = edges.filter(e => 
      nodePositions.has(e.source) && nodePositions.has(e.target)
    ).map(e => ({
      ...e,
      x1: nodePositions.get(e.source)!.x,
      y1: nodePositions.get(e.source)!.y,
      x2: nodePositions.get(e.target)!.x,
      y2: nodePositions.get(e.target)!.y,
    }));

    return { positionedNodes: pNodeArray, positionedEdges: pEdgeArray };
  }, [nodes, edges]);

  const typeColors: Record<string, string> = {
    domain: '#00f0ff',
    subdomain: '#a855f7',
    ip: '#ff6600',
    email: '#00ff41',
    breach: '#ff0040',
    certificate: '#ffd700',
    nameserver: '#60a5fa',
  };

  if (nodes.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-16 h-16 text-gray-800 mx-auto mb-3" />
          <p className="text-sm font-mono text-gray-600">No entities discovered yet</p>
          <p className="text-xs font-mono text-gray-700 mt-1">Run a scan to see the correlation graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[350px] overflow-hidden rounded-lg bg-black/30 border border-cyan-400/5">
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 700 350">
        {/* Edges */}
        {positionedEdges.map((edge, i) => (
          <g key={i}>
            <line
              x1={edge.x1} y1={edge.y1}
              x2={edge.x2} y2={edge.y2}
              stroke="rgba(0,240,255,0.15)"
              strokeWidth={1}
            />
            {/* Arrow */}
            <circle
              cx={(edge.x1 + edge.x2) / 2}
              cy={(edge.y1 + edge.y2) / 2}
              r={2}
              fill="rgba(0,240,255,0.3)"
            />
          </g>
        ))}
        {/* Nodes */}
        {positionedNodes.map((node) => {
          const color = typeColors[node.type] || '#00f0ff';
          const isMain = node.id.startsWith('target-');
          return (
            <g key={node.id}>
              {isMain && (
                <circle cx={node.x} cy={node.y} r={22} fill={color} fillOpacity={0.08} stroke={color} strokeWidth={0.5} strokeOpacity={0.3} />
              )}
              <circle
                cx={node.x} cy={node.y}
                r={isMain ? 14 : 8}
                fill={color}
                fillOpacity={isMain ? 0.25 : 0.15}
                stroke={color}
                strokeWidth={isMain ? 2 : 1}
                strokeOpacity={isMain ? 0.8 : 0.5}
              />
              {isMain && (
                <circle cx={node.x} cy={node.y} r={4} fill={color} fillOpacity={0.8} />
              )}
              <text
                x={node.x} y={node.y + (isMain ? 28 : 20)}
                textAnchor="middle"
                fill={color}
                fillOpacity={0.7}
                fontSize={isMain ? 10 : 8}
                fontFamily="JetBrains Mono, monospace"
              >
                {node.label.length > 20 ? node.label.substring(0, 18) + '..' : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AlertList({ alerts }: { alerts: any[] }) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="w-10 h-10 text-gray-700 mx-auto mb-2" />
        <p className="text-xs font-mono text-gray-600">No alerts</p>
        <p className="text-[10px] font-mono text-gray-700 mt-1">Run scans to generate alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
      {alerts.slice(0, 20).map((alert) => (
        <div key={alert.id} className="p-3 rounded-lg bg-black/20 border border-cyan-400/5 hover:border-cyan-400/10 transition-colors">
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
              alert.type === 'critical' ? 'text-red-400' :
              alert.type === 'high' ? 'text-orange-400' :
              alert.type === 'medium' ? 'text-yellow-400' :
              alert.type === 'low' ? 'text-green-400' : 'text-cyan-400'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-gray-300 font-medium">{alert.title}</p>
              <p className="text-[10px] font-mono text-gray-600 mt-0.5">{alert.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
