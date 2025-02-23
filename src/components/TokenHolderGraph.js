import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
import Layout from './Layout';

const TokenHolderGraph = ({ holders = [], width = 800, height = 600 }) => {
  // Return early if no holders
  if (!holders || holders.length === 0) {
    return (
      <Layout>
        <div className="graph-container" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#fff'
        }}>
          Loading token holder data...
        </div>
      </Layout>
    );
  }

  // Create nodes from holders data
  const graphData = {
    nodes: holders.map(holder => ({
      id: holder.id || holder.address,
      value: holder.value || 0,
      name: holder.name || holder.address.slice(0, 6) + '...' + holder.address.slice(-4),
      address: holder.address
    })).sort((a, b) => b.value - a.value),
    links: []
  };

  const getNodeColor = (node) => {
    if (!node) return '#2ecc71';
    if (node.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7') {
      return '#87CEEB';
    }
    if (node.value > 100000000) {
      return '#ff0000';
    }
    if (node.value > 10000000) {
      return '#ffa500';
    }
    return '#2ecc71';
  };

  return (
    <Layout>
      <div className="graph-container">
        <ForceGraph2D
          graphData={graphData}
          nodeVal={d => Math.sqrt(d?.value || 0) / 100}
          nodeLabel={d => `${d.name}\n${(d.value || 0).toLocaleString()} $TRIBIFY`}
          nodeColor={getNodeColor}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0.3)"
          d3Force={(engine) => {
            engine
              .force('charge', d3.forceManyBody().strength(-200))
              .force('center', d3.forceCenter(width / 2, height / 2))
              .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.value) * 2))
              .force('x', d3.forceX(width / 2).strength(0.1))
              .force('y', d3.forceY(height / 2).strength(0.1));
          }}
        />
      </div>
    </Layout>
  );
};

export default TokenHolderGraph; 