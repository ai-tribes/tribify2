import React, { createContext, useState, useContext, useEffect } from 'react';
import { TribifyContext } from '../context/TribifyContext';

// Create context
export const FinancialContext = createContext();

export const FinancialProvider = ({ children }) => {
  const [financialData, setFinancialData] = useState({
    revenue: {
      current: 0,
      previous: 0,
      ytd: 0
    },
    expenses: {
      current: 0,
      previous: 0,
      ytd: 0
    },
    profit: {
      current: 0,
      previous: 0,
      ytd: 0
    },
    cashReserves: 0,
    historicalDividends: []
  });
  const [loading, setLoading] = useState(false);
  const { publicKey } = useContext(TribifyContext);
  
  // Quarterly profit - will be used in dividend calculations
  const quarterlyProfit = 25000; // Default sample value
  
  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!publicKey) return;
      
      setLoading(true);
      try {
        // In a real implementation, this would fetch data from an API or blockchain
        // For now, we'll use sample data
        
        // Generate increasing revenue for the last 6 quarters
        const quarterlyRevenueHistory = Array(6).fill(0).map((_, i) => ({
          quarter: `Q${(i % 4) + 1} ${2022 + Math.floor(i / 4)}`,
          revenue: 50000 + (i * 10000) + Math.floor(Math.random() * 5000),
          expenses: 30000 + (i * 5000) + Math.floor(Math.random() * 3000),
        }));
        
        // Calculate profits
        const quarterlyProfitHistory = quarterlyRevenueHistory.map(quarter => ({
          ...quarter,
          profit: quarter.revenue - quarter.expenses
        }));
        
        // Historical dividend data
        const historicalDividends = [
          {
            id: 'div-2023-q2',
            date: '2023-07-15',
            name: 'Q2 2023 Dividend',
            totalAmount: 12500,
            currency: 'USDC',
            type: 'proportional',
            recipientCount: 23
          },
          {
            id: 'div-2023-q1',
            date: '2023-04-10',
            name: 'Q1 2023 Dividend',
            totalAmount: 10000,
            currency: 'USDC',
            type: 'proportional',
            recipientCount: 21
          },
          {
            id: 'div-2022-q4',
            date: '2023-01-05',
            name: 'Q4 2022 Dividend',
            totalAmount: 8500,
            currency: 'USDC',
            type: 'proportional',
            recipientCount: 19
          }
        ];
        
        // Current quarter data
        const current = quarterlyProfitHistory[quarterlyProfitHistory.length - 1];
        const previous = quarterlyProfitHistory[quarterlyProfitHistory.length - 2];
        
        // YTD calculations
        const currentYear = new Date().getFullYear();
        const ytdQuarters = quarterlyProfitHistory.filter(q => q.quarter.includes(currentYear.toString()));
        const ytdRevenue = ytdQuarters.reduce((sum, q) => sum + q.revenue, 0);
        const ytdExpenses = ytdQuarters.reduce((sum, q) => sum + q.expenses, 0);
        const ytdProfit = ytdRevenue - ytdExpenses;
        
        setFinancialData({
          revenue: {
            current: current.revenue,
            previous: previous.revenue,
            ytd: ytdRevenue
          },
          expenses: {
            current: current.expenses,
            previous: previous.expenses,
            ytd: ytdExpenses
          },
          profit: {
            current: current.profit,
            previous: previous.profit,
            ytd: ytdProfit
          },
          cashReserves: 75000,
          quarterlyHistory: quarterlyProfitHistory,
          historicalDividends
        });
      } catch (error) {
        console.error('Error fetching financial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFinancialData();
  }, [publicKey]);
  
  return (
    <FinancialContext.Provider value={{ 
      financialData,
      quarterlyProfit,
      loading
    }}>
      {children}
    </FinancialContext.Provider>
  );
};

// Hook for easy context use
export const useFinancials = () => useContext(FinancialContext); 