import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import bs58 from 'bs58';
import { fal } from "@fal-ai/client";

// Configure FAL.ai client
fal.config({
  credentials: process.env.FAL_API_KEY
});

// Need this for proper buffer handling
const Buffer = require('buffer').Buffer;

function LandingPage() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [scrolled, setScrolled] = useState(false);
  const [demoVideo, setDemoVideo] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // Generate site visuals using FAL.ai
  const generateSiteVisuals = async () => {
    try {
      // Generate hero background
      const heroBackground = await fal.subscribe("fal-ai/fast-sdxl", {
        input: {
          prompt: "A modern, abstract tech background with glowing green circuits and blockchain nodes, perfect for a crypto trading platform. Subtle, professional, dark theme.",
          width: 1920,
          height: 1080,
          scheduler: "K_EULER",
          num_inference_steps: 50
        }
      });

      // Generate feature icons
      const iconPrompts = {
        sniper: "Minimalist icon of a target scope with green accents, tech style",
        wallet: "Minimalist icon of a digital wallet with green highlights",
        distribution: "Minimalist icon of connected nodes distributing resources",
        recovery: "Minimalist icon of a shield with a recovery arrow"
      };

      const icons = await Promise.all(
        Object.entries(iconPrompts).map(async ([key, prompt]) => {
          const result = await fal.subscribe("fal-ai/fast-sdxl", {
            input: {
              prompt,
              width: 256,
              height: 256,
              scheduler: "K_EULER",
              num_inference_steps: 30
            }
          });
          return { key, url: result.data.images[0].url };
        })
      );

      // Store generated assets in localStorage for caching
      localStorage.setItem('tribify_hero_bg', heroBackground.data.images[0].url);
      icons.forEach(({key, url}) => {
        localStorage.setItem(`tribify_icon_${key}`, url);
      });

    } catch (error) {
      console.error('Error generating visuals:', error);
    }
  };

  // Generate visuals on first load
  useEffect(() => {
    if (!localStorage.getItem('tribify_hero_bg')) {
      generateSiteVisuals();
    }
  }, []);

  // Handle scroll events for navbar
  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      if (position > 100) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Update active section based on scroll position
      const sections = ['hero', 'features', 'business', 'staking'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      if (!('phantom' in window)) {
        alert('Please install Phantom wallet first!');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        alert('Please install Phantom wallet!');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Connect and get parent wallet
      const connectResponse = await provider.connect();
      const parentWalletKey = connectResponse.publicKey.toString();
      console.log("Parent Wallet Connected:", parentWalletKey);

      // Sign message to prove ownership AND use as seed for HD wallet
      const message = `Tribify Wallet Generation\nParent: ${parentWalletKey}\nTimestamp: ${Date.now()}`;
      
      try {
        // Convert message to Uint8Array properly
        const encodedMessage = new TextEncoder().encode(message);
        const signResponse = await provider.signMessage(encodedMessage, 'utf8');
        
        // Handle the signature data properly
        const signatureData = signResponse.signature ? signResponse.signature : signResponse;
        
        // Store parent wallet info securely
        localStorage.setItem('tribify_parent_wallet', parentWalletKey);
        
        // Store the signature as seed
        if (Buffer.isBuffer(signatureData)) {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, 
            bs58.encode(signatureData));
        } else if (signatureData instanceof Uint8Array) {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, 
            bs58.encode(Buffer.from(signatureData)));
        } else if (typeof signatureData === 'string') {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, signatureData);
        } else {
          throw new Error('Unexpected signature format');
        }

        navigate('/app');

      } catch (signError) {
        console.error('Signature error:', signError);
        if (signError.code === 4001) {
          alert('You must sign the message to generate your secure wallet!');
        } else {
          alert('Failed to sign: ' + signError.message);
        }
        await provider.disconnect();
      }

    } catch (error) {
      console.error('Connection error:', error);
      if (error.code === 4001) {
        alert('Please connect your wallet to continue!');
      } else {
        alert('Connection failed: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const generateAIDemo = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const result = await fal.subscribe("fal-ai/sync-lipsync", {
        input: {
          video_url: "https://fal.media/files/koala/8teUPbRRMtAUTORDvqy0l.mp4",
          audio_url: "https://fal.media/files/lion/vyFWygmZsIZlUO4s0nr2n.wav"
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });
      
      if (result.data && result.data.output_url) {
        setDemoVideo(result.data.output_url);
      }
    } catch (error) {
      console.error('AI Generation error:', error);
      setGenerationError('Failed to generate AI demo. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-logo">
            <span className="logo-text">TRIBIFY.AI</span>
          </div>
          <div className="navbar-links">
            <button 
              className={activeSection === 'hero' ? 'active' : ''} 
              onClick={() => scrollToSection('hero')}
            >
              Home
            </button>
            <button 
              className={activeSection === 'features' ? 'active' : ''} 
              onClick={() => scrollToSection('features')}
            >
              Features
            </button>
            <button 
              className={activeSection === 'business' ? 'active' : ''} 
              onClick={() => scrollToSection('business')}
            >
              Advanced
            </button>
            <button 
              className={activeSection === 'staking' ? 'active' : ''} 
              onClick={() => scrollToSection('staking')}
            >
              Staking
            </button>
          </div>
          <button 
            className="navbar-connect-btn"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        className="hero-section" 
        id="hero" 
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${localStorage.getItem('tribify_hero_bg')})`
        }}
      >
        <div className="hero-content">
          <div className="hero-badge">Solana Ecosystem</div>
          <h1>Welcome to TRIBIFY.AI</h1>
          <p className="hero-subtitle">
            Advanced Multi-Wallet Management & Trading Platform on Solana
          </p>
          <div className="hero-cta">
            <button 
              onClick={handleConnect} 
              className="connect-button primary-btn"
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Phantom Wallet'}
            </button>
            <button 
              onClick={() => scrollToSection('features')} 
              className="secondary-btn"
            >
              Explore Features
            </button>
          </div>
          <p className="security-note">
            Secure HD wallet generation with your Phantom wallet as the parent.
            Each child wallet is uniquely derived and fully recoverable.
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-value">100+</span>
              <span className="stat-label">Wallets Supported</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">0.5s</span>
              <span className="stat-label">Transaction Speed</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">24/7</span>
              <span className="stat-label">Monitoring</span>
            </div>
          </div>
        </div>
        <div className="scroll-indicator" onClick={() => scrollToSection('features')}>
          <span className="scroll-text">Scroll Down</span>
          <span className="scroll-arrow">↓</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="section-header">
          <div className="section-badge">Platform Features</div>
          <h2>Trading & Distribution Tools</h2>
          <p className="section-description">
            Powerful tools designed for professional traders and token projects
          </p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div 
              className="feature-icon sniper-icon" 
              style={{
                backgroundImage: `url(${localStorage.getItem('tribify_icon_sniper')})`
              }}
            ></div>
            <h3>Token Sniper</h3>
            <p>Advanced sniping with customizable targets, price conditions, and multi-wallet execution</p>
            <a href="#" className="feature-link" onClick={(e) => { e.preventDefault(); handleConnect(); }}>
              Try Now <span className="arrow">→</span>
            </a>
          </div>
          <div className="feature-card">
            <div 
              className="feature-icon wallet-icon" 
              style={{
                backgroundImage: `url(${localStorage.getItem('tribify_icon_wallet')})`
              }}
            ></div>
            <h3>Multi-Wallet Management</h3>
            <p>Generate and manage multiple sub-wallets with automatic balance tracking and fund distribution</p>
            <a href="#" className="feature-link" onClick={(e) => { e.preventDefault(); handleConnect(); }}>
              Try Now <span className="arrow">→</span>
            </a>
          </div>
          <div className="feature-card">
            <div 
              className="feature-icon distribution-icon" 
              style={{
                backgroundImage: `url(${localStorage.getItem('tribify_icon_distribution')})`
              }}
            ></div>
            <h3>Auto Distribution</h3>
            <p>Schedule and automate token distributions with customizable amounts and timing</p>
            <a href="#" className="feature-link" onClick={(e) => { e.preventDefault(); handleConnect(); }}>
              Try Now <span className="arrow">→</span>
            </a>
          </div>
          <div className="feature-card">
            <div 
              className="feature-icon recovery-icon" 
              style={{
                backgroundImage: `url(${localStorage.getItem('tribify_icon_recovery')})`
              }}
            ></div>
            <h3>Smart Recovery</h3>
            <p>One-click token recovery from all sub-wallets back to your parent wallet</p>
            <a href="#" className="feature-link" onClick={(e) => { e.preventDefault(); handleConnect(); }}>
              Try Now <span className="arrow">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="section-header">
          <div className="section-badge">Testimonials</div>
          <h2>What Our Users Say</h2>
        </div>
        <div className="testimonials-container">
          <div className="testimonial-card">
            <div className="testimonial-content">
              <p>"TRIBIFY.AI has revolutionized how I manage my Solana tokens. The multi-wallet feature saves me hours every week."</p>
            </div>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <h4>Alex Thompson</h4>
                <p>Solana Developer</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-content">
              <p>"The token distribution system is a game-changer for our project. We can now manage rewards efficiently across thousands of wallets."</p>
            </div>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <h4>Sarah Chen</h4>
                <p>Project Lead, SolToken</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-content">
              <p>"The sniper tool helped me secure tokens at launch with precision I couldn't achieve manually. Highly recommended!"</p>
            </div>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <h4>Michael Rodriguez</h4>
                <p>Professional Trader</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Section */}
      <section className="business-section" id="business">
        <div className="section-header">
          <div className="section-badge">Enterprise Solutions</div>
          <h2>Advanced Features</h2>
          <p className="section-description">
            Comprehensive tools for businesses and token projects
          </p>
        </div>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon dividend-icon"></div>
            <h3>Dividend System</h3>
            <p>Automated revenue distribution to shareholders with flexible allocation models</p>
            <ul className="benefit-list">
              <li>Customizable distribution schedules</li>
              <li>Multiple token support</li>
              <li>Transparent allocation tracking</li>
            </ul>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon governance-icon"></div>
            <h3>Governance</h3>
            <p>Integrated voting system for decentralized decision-making</p>
            <ul className="benefit-list">
              <li>Proposal creation and voting</li>
              <li>Weighted voting based on holdings</li>
              <li>Automated execution of passed proposals</li>
            </ul>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon analytics-icon"></div>
            <h3>Token Analytics</h3>
            <p>Real-time holder tracking and interactive token distribution graphs</p>
            <ul className="benefit-list">
              <li>Holder concentration metrics</li>
              <li>Distribution visualization</li>
              <li>Historical data tracking</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Staking Section */}
      <section className="staking-section" id="staking">
        <div className="section-header">
          <div className="section-badge">Rewards</div>
          <h2>Staking & Rewards</h2>
          <p className="section-description">
            Earn passive income and participate in platform governance
          </p>
        </div>
        <div className="staking-content">
          <div className="staking-info">
            <p>Stake TRIBIFY tokens to earn platform rewards and participate in governance</p>
            <div className="staking-stats">
              <div className="staking-stat">
                <span className="stat-value">12%</span>
                <span className="stat-label">APY</span>
              </div>
              <div className="staking-stat">
                <span className="stat-value">7 Days</span>
                <span className="stat-label">Lock Period</span>
              </div>
              <div className="staking-stat">
                <span className="stat-value">Weekly</span>
                <span className="stat-label">Rewards</span>
              </div>
            </div>
            <button 
              onClick={handleConnect} 
              className="staking-btn"
            >
              Start Staking
            </button>
          </div>
        </div>
      </section>

      {/* Add AI Demo section before the CTA section */}
      <section className="ai-demo-section">
        <div className="section-header">
          <div className="section-badge">AI-Powered</div>
          <h2>Experience AI Magic</h2>
          <p className="section-description">
            Watch our AI transform content in real-time using FAL.ai technology
          </p>
        </div>
        <div className="ai-demo-content">
          <div className="demo-container">
            {demoVideo ? (
              <video 
                className="demo-video" 
                controls 
                src={demoVideo}
                poster="/ai-demo-poster.jpg"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="demo-placeholder">
                <img src="/ai-demo-placeholder.jpg" alt="AI Demo Placeholder" />
              </div>
            )}
            {generationError && (
              <div className="error-message">{generationError}</div>
            )}
            <button 
              className={`demo-button ${isGenerating ? 'generating' : ''}`}
              onClick={generateAIDemo}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                'Generate AI Demo'
              )}
            </button>
          </div>
          <div className="demo-features">
            <div className="demo-feature">
              <div className="feature-icon ai-icon"></div>
              <h3>Real-time Processing</h3>
              <p>Watch as our AI transforms content instantly</p>
            </div>
            <div className="demo-feature">
              <div className="feature-icon sync-icon"></div>
              <h3>Perfect Synchronization</h3>
              <p>Flawless audio-visual alignment</p>
            </div>
            <div className="demo-feature">
              <div className="feature-icon quality-icon"></div>
              <h3>High Quality Output</h3>
              <p>Professional-grade results every time</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Enhance Your Solana Trading?</h2>
          <p>Connect your wallet now and experience the power of TRIBIFY.AI</p>
          <button 
            onClick={handleConnect} 
            className="cta-button"
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Get Started Now'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-text">TRIBIFY.AI</span>
            <p>Advanced Multi-Wallet Management & Trading Platform</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#business">Enterprise</a></li>
                <li><a href="#staking">Staking</a></li>
                <li><a href="#">Documentation</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">API</a></li>
                <li><a href="#">Status</a></li>
                <li><a href="#">Blog</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">Legal</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} TRIBIFY.AI. All rights reserved.</p>
          <div className="social-links">
            <a href="#" className="social-link">Twitter</a>
            <a href="#" className="social-link">Discord</a>
            <a href="#" className="social-link">Telegram</a>
            <a href="#" className="social-link">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
