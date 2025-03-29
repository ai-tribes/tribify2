import React, { useEffect, useRef, useState } from 'react';
import './Graph.css';

const TOTAL_SUPPLY = 1_000_000_000; // 1 Billion tokens
const COLORS = {
  LP: '#87CEEB',      // Light blue for LP
  WHALE: '#ff0000',   // Red for whales (>10%)
  MEDIUM: '#ffa500',  // Orange for medium holders (1-10%)
  SMALL: '#2ecc71'    // Green for small holders (<1%)
};

function Graph({ holders = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredHolder, setHoveredHolder] = useState(null);
  const [circles, setCircles] = useState([]);

  // Calculate holder type and color
  const getHolderColor = (address, balance = 0) => {
    if (address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7') {
      return COLORS.LP;
    }
    const percentage = (balance / TOTAL_SUPPLY) * 100;
    if (percentage > 10) return COLORS.WHALE;
    if (percentage > 1) return COLORS.MEDIUM;
    return COLORS.SMALL;
  };

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate circle positions using force-directed layout
  useEffect(() => {
    if (!dimensions.width || !holders.length) return;

    // Filter out holders with undefined or null tokenBalance
    const validHolders = holders.filter(h => h && typeof h.tokenBalance === 'number');
    if (!validHolders.length) return;

    const maxBalance = Math.max(...validHolders.map(h => h.tokenBalance));
    const minRadius = 20;
    const maxRadius = 100;

    // Create initial circle data
    const newCircles = validHolders.map(holder => ({
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      radius: minRadius + ((holder.tokenBalance || 0) / maxBalance) * (maxRadius - minRadius),
      color: getHolderColor(holder.address, holder.tokenBalance),
      holder: holder,
      vx: 0,
      vy: 0
    }));

    // Force-directed layout simulation
    const simulation = () => {
      const centerForce = 0.000001;
      const repulsionForce = 0.1;
      const friction = 0.99;

      newCircles.forEach(circle => {
        // Center gravity
        const dx = dimensions.width / 2 - circle.x;
        const dy = dimensions.height / 2 - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        circle.vx += (dx / distance) * centerForce * distance;
        circle.vy += (dy / distance) * centerForce * distance;

        // Repulsion between circles
        newCircles.forEach(other => {
          if (circle === other) return;
          const dx = other.x - circle.x;
          const dy = other.y - circle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = circle.radius + other.radius;
          
          if (distance < minDistance) {
            const force = (minDistance - distance) * repulsionForce;
            const angle = Math.atan2(dy, dx);
            circle.vx -= Math.cos(angle) * force;
            circle.vy -= Math.sin(angle) * force;
          }
        });

        // Apply velocity with friction
        circle.vx *= friction;
        circle.vy *= friction;
        circle.x += circle.vx;
        circle.y += circle.vy;

        // Keep circles within bounds
        circle.x = Math.max(circle.radius, Math.min(dimensions.width - circle.radius, circle.x));
        circle.y = Math.max(circle.radius, Math.min(dimensions.height - circle.radius, circle.y));
      });
    };

    // Run simulation steps
    for (let i = 0; i < 300; i++) {
      simulation();
    }

    setCircles(newCircles);
  }, [dimensions, holders]);

  // Draw the graph
  useEffect(() => {
    if (!canvasRef.current || !circles.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw circles
    circles.forEach(circle => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fillStyle = circle.color;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw percentage text
      const percentage = ((circle.holder.tokenBalance || 0) / TOTAL_SUPPLY * 100).toFixed(2);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Roboto Mono';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (circle.radius > 30) {
        ctx.fillText(`${percentage}%`, circle.x, circle.y);
      }
    });
  }, [circles, dimensions]);

  // Handle mouse interactions
  const handleMouseMove = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find hovered circle
    const hoveredCircle = circles.find(circle => {
      const dx = circle.x - x;
      const dy = circle.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= circle.radius;
    });

    setHoveredHolder(hoveredCircle?.holder || null);
  };

  return (
    <div className="graph-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredHolder(null)}
      />
      
      {hoveredHolder && (
        <div 
          className="holder-tooltip"
          style={{ 
            left: Math.min(dimensions.width - 200, hoveredHolder.x),
            top: hoveredHolder.y + 20
          }}
        >
          <div className="tooltip-address">
            {hoveredHolder.address?.slice(0, 6)}...{hoveredHolder.address?.slice(-4)}
          </div>
          <div className="tooltip-balance">
            {(hoveredHolder.tokenBalance || 0).toLocaleString()} TRIBIFY
          </div>
          <div className="tooltip-percentage">
            {((hoveredHolder.tokenBalance || 0) / TOTAL_SUPPLY * 100).toFixed(4)}%
          </div>
        </div>
      )}

      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: COLORS.LP }}></div>
          <span>LP</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: COLORS.WHALE }}></div>
          <span>Whale (&gt;10%)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: COLORS.MEDIUM }}></div>
          <span>Medium (1-10%)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: COLORS.SMALL }}></div>
          <span>Small (&lt;1%)</span>
        </div>
      </div>
    </div>
  );
}

export default Graph; 