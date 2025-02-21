import React from 'react';
import './ChartView.css';

function ChartView() {
  const chartUrl = "https://pump.fun/coin/672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h2>TRIBIFY Chart</h2>
        <div className="chart-actions">
          <a 
            href={chartUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="view-chart-btn"
          >
            View Chart
          </a>
        </div>
      </div>
      <div className="chart-placeholder">
        <div className="placeholder-content">
          <h3>TRIBIFY Price Chart</h3>
          <p>Click above to view the live chart on Pump.fun</p>
          <div className="chart-info">
            <div className="info-item">
              <span>Token:</span>
              <span>TRIBIFY</span>
            </div>
            <div className="info-item">
              <span>Contract:</span>
              <span>672PLq...upump</span>
            </div>
            <div className="info-item">
              <span>Platform:</span>
              <span>Pump.fun</span>
            </div>
          </div>
          <p className="note">Note: External chart opens in new tab due to Pump.fun's security settings</p>
        </div>
      </div>
    </div>
  );
}

export default ChartView; 