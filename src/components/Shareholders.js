const Shareholders = ({ 
  tokenHolders, 
  nicknames,
  onMessageClick  // This will trigger the existing message modal
}) => {
  return (
    <div className="token-holders">
      <h3>$Tribify Shareholders</h3>
      <div className="holders-list">
        {tokenHolders.map(holder => (
          <div key={holder.address} className="holder-item">
            <div className="holder-info">
              <span className="holder-name">
                {nicknames[holder.address] || holder.address}
              </span>
              <span className="holder-balance">
                {holder.tokenBalance.toLocaleString()} $TRIBIFY
              </span>
            </div>
            <button 
              className="message-button"
              onClick={() => onMessageClick(holder.address)}  // Just pass the address
            >
              Message
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shareholders; 