const HoldersList = ({ 
  holders, 
  nicknames,
  setNicknames,
  onNodeClick
}) => {
  return (
    <div className="holders-list">
      {holders.map(holder => (
        <div key={holder.address} className="holder-item">
          <div className="holder-info">
            <div className="holder-name">
              {nicknames[holder.address] || holder.address}
            </div>
            <div className="holder-balance">
              {holder.tokenBalance.toLocaleString()} $TRIBIFY
            </div>
          </div>
          <div className="holder-actions">
            <button 
              className="message-button"
              // Remove onClick handler but keep the button
            >
              Message
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}; 