import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';

const TokenHolderGraph = ({ holders, width, height }) => {
  // Create nodes from holders data
  const graphData = {
    nodes: holders.map(holder => ({
      id: holder.id,
      value: holder.value,
      name: holder.name,
      address: holder.address
    })).sort((a, b) => b.value - a.value), // Sort by size
    links: []
  };

  const getNodeColor = (node) => {
    if (node.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7') {
      return '#87CEEB';  // Light blue for LP
    }
    if (node.value > 100000000) {
      return '#ff0000';  // Red for whales
    }
    if (node.value > 10000000) {
      return '#ffa500';  // Orange for medium holders
    }
    return '#2ecc71';  // Green for small holders
  };

  return (
    <ForceGraph2D
      graphData={graphData}
      nodeVal={d => Math.sqrt(d.value) / 100}
      nodeLabel={d => `${d.name}\n${d.value.toLocaleString()} $TRIBIFY`}
      nodeColor={getNodeColor}
      width={width}
      height={height}
      d3Force={('charge', d3.forceManyBody().strength(-200))}
      d3Force={('center', d3.forceCenter(width / 2, height / 2))}
      d3Force={('collision', d3.forceCollide().radius(d => Math.sqrt(d.value) * 2))}
      d3Force={('x', d3.forceX(width / 2).strength(0.1))}
      d3Force={('y', d3.forceY(height / 2).strength(0.1))}
      backgroundColor="rgba(0,0,0,0.3)"
    />
  );
};

export default TokenHolderGraph; 