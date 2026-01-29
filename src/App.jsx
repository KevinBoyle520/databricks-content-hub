import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';

// Google Sheet CSV URL - Update this if you change your sheet
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0Gxp0gr3kpQ5E8KpZT_GNw4qZnV2vyFdFDetrgU_d63DYm5hR401XLFDBJzVkiDWkssP_pPCuMghc/pub?output=csv';

// Mapping from raw CSV values to consolidated categories
// Includes both legacy raw values AND the consolidated names themselves
const AUDIENCE_MAP = {
  // Consolidated names (pass through)
  'engineering': 'Engineering',
  'analytics & bi': 'Analytics & BI',
  'ai/ml': 'AI/ML',
  'leadership': 'Leadership',
  'product & gtm': 'Product & GTM',
  // Legacy raw values (for backwards compatibility)
  'data engineering': 'Engineering',
  'data architects': 'Engineering',
  'technical leadership': 'Engineering',
  'architecture': 'Engineering',
  'data warehousing': 'Analytics & BI',
  'analysts': 'Analytics & BI',
  'bi team': 'Analytics & BI',
  'ai': 'AI/ML',
  'mlops/llmops': 'AI/ML',
  'product': 'Product & GTM',
  'sales': 'Product & GTM',
  'marketing': 'Product & GTM',
};

const AREA_MAP = {
  // Consolidated names (pass through)
  'ai & agents': 'AI & Agents',
  'data engineering': 'Data Engineering',
  'data warehousing': 'Data Warehousing',
  'governance': 'Governance',
  'strategy': 'Strategy',
  'customer stories': 'Customer Stories',
  'customer story': 'Customer Stories',
  'product releases': 'Product Releases',
  // Legacy raw values (for backwards compatibility)
  'ai': 'AI & Agents',
  'agentic ai': 'AI & Agents',
  'llmops': 'AI & Agents',
  'orchestration': 'Data Engineering',
  'data and platform engineering': 'Data Engineering',
  'dashboards': 'Data Warehousing',
  'data analysis': 'Data Warehousing',
  'data governance': 'Governance',
  'architecture': 'Governance',
  'product engineering': 'Customer Stories',
  'retrospective reports': 'Data Warehousing',
};

// Month order for sorting
const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function parseAudience(raw) {
  if (!raw) return [];
  const items = raw.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const mapped = new Set();
  items.forEach(item => {
    if (AUDIENCE_MAP[item]) {
      mapped.add(AUDIENCE_MAP[item]);
    }
  });
  return [...mapped];
}

function parseArea(raw) {
  if (!raw) return [];
  const items = raw.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const mapped = new Set();
  items.forEach(item => {
    if (AREA_MAP[item]) {
      mapped.add(AREA_MAP[item]);
    }
  });
  return [...mapped];
}

function detectBadge(url, topic) {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = topic.match(/\[([^\]]*)\]/);
    return match ? match[1] : 'Video';
  }
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('medium.com')) return 'Medium';
  if (url.includes('spotify.com')) return 'Spotify';
  return null;
}

function cleanTopic(topic) {
  return topic.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
}

export default function App() {
  const [contentData, setContentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAudiences, setSelectedAudiences] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let currentMonth = '';
    
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const parsed = results.data
          .filter(row => row.Topic && row.Topic.trim())
          .map(row => {
            if (row.Month && row.Month.trim()) {
              currentMonth = row.Month.trim();
            }
            return {
              month: currentMonth,
              topic: cleanTopic(row.Topic || ''),
              audience: parseAudience(row.Audience),
              summary: row['Why is it important?'] || '',
              area: parseArea(row.Area),
              url: row.URL || '',
              badge: detectBadge(row.URL, row.Topic || ''),
              featured: (row.Featured || '').toLowerCase().trim() === 'yes',
            };
          });
        setContentData(parsed.reverse());
        setLoading(false);
      },
      error: (err) => {
        setError('Failed to load content. Please try again later.');
        setLoading(false);
        console.error(err);
      }
    });
  }, []);

  const allAudiences = useMemo(() => 
    [...new Set(contentData.flatMap(item => item.audience))].sort(),
    [contentData]
  );
  
  const allAreas = useMemo(() => 
    [...new Set(contentData.flatMap(item => item.area))].sort(),
    [contentData]
  );

  // Get all unique months with their article counts, sorted chronologically
  const monthsWithCounts = useMemo(() => {
    const counts = {};
    contentData.forEach(item => {
      if (item.month) {
        counts[item.month] = (counts[item.month] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => MONTH_ORDER.indexOf(a[0]) - MONTH_ORDER.indexOf(b[0]))
      .map(([month, count]) => ({ month, count }));
  }, [contentData]);

  const featuredArticle = useMemo(() => 
    contentData.find(item => item.featured) || null,
    [contentData]
  );

  const filteredContent = useMemo(() => {
    return contentData.filter(item => {
      const matchesAudience = selectedAudiences.length === 0 || 
        item.audience.some(a => selectedAudiences.includes(a));
      const matchesArea = selectedAreas.length === 0 || 
        item.area.some(a => selectedAreas.includes(a));
      const matchesMonth = !selectedMonth || item.month === selectedMonth;
      const matchesSearch = searchQuery === '' || 
        item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesAudience && matchesArea && matchesMonth && matchesSearch;
    });
  }, [contentData, selectedAudiences, selectedAreas, selectedMonth, searchQuery]);

  const toggleAudience = (audience) => {
    setSelectedAudiences(prev => 
      prev.includes(audience) ? prev.filter(a => a !== audience) : [...prev, audience]
    );
  };

  const toggleArea = (area) => {
    setSelectedAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleMonthClick = (month, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedMonth(prev => prev === month ? null : month);
  };

  const clearFilters = () => {
    setSelectedAudiences([]);
    setSelectedAreas([]);
    setSelectedMonth(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedAudiences.length > 0 || selectedAreas.length > 0 || selectedMonth || searchQuery !== '';

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FDFCFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Instrument Sans', -apple-system, sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap');
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E8E5E0',
            borderTopColor: '#FF3621',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#666', fontSize: '15px' }}>Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FDFCFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Instrument Sans', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p style={{ color: '#666', fontSize: '17px' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FDFCFA',
      color: '#1a1a1a',
      fontFamily: "'Instrument Sans', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-in {
          animation: fadeUp 0.6s ease-out forwards;
        }
        
        .stagger-1 { animation-delay: 0.1s; opacity: 0; }
        .stagger-2 { animation-delay: 0.2s; opacity: 0; }
        .stagger-3 { animation-delay: 0.3s; opacity: 0; }
        
        .filter-chip {
          padding: 10px 18px;
          border-radius: 100px;
          border: 1.5px solid #E0DDD8;
          background: transparent;
          color: #666;
          font-size: 13px;
          font-family: 'Instrument Sans', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        
        .filter-chip:hover {
          border-color: #FF3621;
          color: #FF3621;
          transform: translateY(-1px);
        }
        
        .filter-chip.active {
          background: #FF3621;
          border-color: #FF3621;
          color: white;
          box-shadow: 0 4px 12px rgba(255, 54, 33, 0.3);
        }
        
        .content-card {
          background: white;
          border: 1px solid #E8E5E0;
          border-radius: 16px;
          padding: 28px;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          display: block;
          color: inherit;
        }
        
        .content-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 0;
          background: linear-gradient(180deg, #FF3621 0%, #FF6B4A 100%);
          transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 0 0 4px 0;
        }
        
        .content-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          border-color: #d0cdc8;
        }
        
        .content-card:hover::before {
          height: 100%;
        }
        
        .content-card:hover .card-arrow {
          opacity: 1;
          transform: translate(0, 0);
        }
        
        .card-arrow {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #FF3621;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translate(-8px, 8px);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .tag {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        
        .tag-audience {
          background: #F0EDE8;
          color: #666;
        }
        
        .tag-area {
          background: #E8F4EC;
          color: #2D6A4F;
        }
        
        .search-input {
          width: 100%;
          padding: 16px 24px;
          padding-left: 56px;
          border-radius: 100px;
          border: 1.5px solid #E0DDD8;
          background: white;
          color: #1a1a1a;
          font-size: 15px;
          font-family: 'Instrument Sans', sans-serif;
          transition: all 0.25s ease;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #FF3621;
          box-shadow: 0 0 0 4px rgba(255, 54, 33, 0.08);
        }
        
        .search-input::placeholder {
          color: #999;
        }
        
        .clear-btn {
          padding: 10px 20px;
          border-radius: 100px;
          border: none;
          background: #1a1a1a;
          color: white;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Instrument Sans', sans-serif;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        
        .clear-btn:hover {
          background: #333;
          transform: translateY(-1px);
        }
        
        .section-label {
          font-size: 11px;
          font-weight: 700;
          color: #FF3621;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 14px;
          display: block;
        }
        
        .month-badge {
          font-family: 'Fraunces', serif;
          font-size: 13px;
          color: #999;
          font-weight: 400;
          cursor: pointer;
          padding: 4px 10px;
          border-radius: 6px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        
        .month-badge:hover {
          background: #FFF4F2;
          color: #FF3621;
          border-color: #FFD9D4;
        }
        
        .month-badge.active {
          background: #FF3621;
          color: white;
          border-color: #FF3621;
        }
        
        .source-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: #FFF4E6;
          color: #B86E00;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-radius: 4px;
        }
        
        .geometric-accent {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 54, 33, 0.03) 0%, transparent 70%);
          pointer-events: none;
        }
        
        .footer-link {
          color: #FF3621;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s ease;
        }
        
        .footer-link:hover {
          opacity: 0.7;
        }
        
        .name-link {
          color: #FF3621;
          text-decoration: none;
          transition: opacity 0.2s ease;
        }
        
        .name-link:hover {
          opacity: 0.8;
        }
        
        .featured-card {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border-radius: 20px;
          padding: 36px;
          color: white;
          text-decoration: none;
          display: block;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          max-width: 480px;
          min-height: 320px;
        }
        
        .featured-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #FF3621 0%, #FF6B4A 100%);
        }
        
        .featured-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }
        
        .featured-card:hover .featured-arrow {
          transform: translate(0, 0);
          opacity: 1;
        }
        
        .featured-arrow {
          position: absolute;
          top: 32px;
          right: 32px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #FF3621;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translate(-8px, 8px);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .featured-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 54, 33, 0.15);
          color: #FF6B4A;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .featured-tag {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
        }
        
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 998;
          animation: fadeIn 0.3s ease;
        }
        
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 300px;
          background: white;
          z-index: 999;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
          animation: slideIn 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        
        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid #E8E5E0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .sidebar-close {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #F5F3F0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .sidebar-close:hover {
          background: #E8E5E0;
        }
        
        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        
        .month-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 4px;
          border: 1px solid transparent;
        }
        
        .month-list-item:hover {
          background: #FFF4F2;
          border-color: #FFE8E4;
        }
        
        .month-list-item.active {
          background: #FF3621;
          color: white;
        }
        
        .month-list-item.active .month-count {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        .month-count {
          font-size: 12px;
          font-weight: 600;
          background: #F0EDE8;
          color: #666;
          padding: 4px 10px;
          border-radius: 100px;
          transition: all 0.2s ease;
        }
        
        .calendar-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 100px;
          border: 1.5px solid #E0DDD8;
          background: transparent;
          color: #666;
          font-size: 13px;
          font-family: 'Instrument Sans', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        
        .calendar-btn:hover {
          border-color: #FF3621;
          color: #FF3621;
          transform: translateY(-1px);
        }
        
        .calendar-btn.has-selection {
          background: #FF3621;
          border-color: #FF3621;
          color: white;
          box-shadow: 0 4px 12px rgba(255, 54, 33, 0.3);
        }
        
        .active-filter-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #FFF4F2;
          border: 1px solid #FFD9D4;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 500;
          color: #FF3621;
        }
        
        .active-filter-tag button {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #FF3621;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        
        .active-filter-tag button:hover {
          opacity: 1;
        }
      `}</style>
      
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Month Sidebar */}
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-header">
            <div>
              <h3 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '20px',
                fontWeight: 600,
                margin: '0 0 4px 0',
              }}>
                Browse by Month
              </h3>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
                2026 Archive
              </p>
            </div>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="sidebar-content">
            <div 
              className={`month-list-item ${!selectedMonth ? 'active' : ''}`}
              onClick={() => { setSelectedMonth(null); setSidebarOpen(false); }}
            >
              <span style={{ fontWeight: 500 }}>All Months</span>
              <span className="month-count">{contentData.length}</span>
            </div>
            
            <div style={{ 
              height: '1px', 
              background: '#E8E5E0', 
              margin: '12px 0' 
            }} />
            
            {monthsWithCounts.map(({ month, count }) => (
              <div 
                key={month}
                className={`month-list-item ${selectedMonth === month ? 'active' : ''}`}
                onClick={() => { setSelectedMonth(month); setSidebarOpen(false); }}
              >
                <span style={{ fontWeight: 500 }}>{month}</span>
                <span className="month-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Geometric Accents */}
      <div className="geometric-accent" style={{ top: '-200px', right: '-100px' }} />
      <div className="geometric-accent" style={{ bottom: '200px', left: '-200px' }} />
      
      {/* Header */}
      <header style={{
        padding: '64px 32px 48px',
        maxWidth: '1300px',
        margin: '0 auto',
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '48px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 500px' }}>
          <div className="animate-in stagger-1" style={{ marginBottom: '24px' }}>
            <span style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: '#1a1a1a',
              color: 'white',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              borderRadius: '4px',
            }}>
              Curated by <a 
  href="https://www.linkedin.com/in/kevin-boyle-/" 
  target="_blank" 
  rel="noopener noreferrer"
  className="name-link"
  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
>
  Kevin Boyle
  <svg width="14" height="14" viewBox="0 0 24 24" fill="0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
</a>
            </span>
          </div>
          
          <h1 className="animate-in stagger-2" style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 700,
            margin: '0 0 20px 0',
            lineHeight: 1.05,
            color: '#1a1a1a',
            maxWidth: '800px',
          }}>
            Databricks
            <br />
            <span style={{ color: '#FF3621' }}>Content Hub</span>
          </h1>
          
          <p className="animate-in stagger-3" style={{
            fontSize: '18px',
            color: '#666',
            margin: 0,
            maxWidth: '520px',
            lineHeight: 1.7,
          }}>
            The latest features, updates, and customer stories—filtered by what matters to you.
          </p>
        </div>
        
        {/* Featured Content */}
        {featuredArticle && (
          <a 
            href={featuredArticle.url}
            target="_blank"
            rel="noopener noreferrer"
            className="featured-card animate-in stagger-3"
            style={{ flex: '0 1 480px' }}
          >
            <div className="featured-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <div className="featured-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Featured
            </div>
            
            <h3 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '24px',
              fontWeight: 600,
              margin: '0 0 16px 0',
              lineHeight: 1.3,
              paddingRight: '48px',
            }}>
              {featuredArticle.topic}
            </h3>
            
            <p style={{
              fontSize: '15px',
              lineHeight: 1.7,
              color: 'rgba(255, 255, 255, 0.7)',
              margin: '0 0 24px 0',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {featuredArticle.summary}
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {featuredArticle.area.slice(0, 3).map(a => (
                <span key={a} className="featured-tag">{a}</span>
              ))}
            </div>
          </a>
        )}
      </header>

      {/* Filters */}
      <section style={{
        padding: '0 32px 40px',
        maxWidth: '1300px',
        margin: '0 auto',
      }}>
        {/* Search and Month Button Row */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '32px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '480px' }}>
            <svg 
              style={{
                position: 'absolute',
                left: '22px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#999',
              }}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search topics or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <button 
            className={`calendar-btn ${selectedMonth ? 'has-selection' : ''}`}
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {selectedMonth ? selectedMonth : 'Browse by Month'}
          </button>
        </div>

        {/* Active Month Filter Display */}
        {selectedMonth && (
          <div style={{ marginBottom: '20px' }}>
            <span className="active-filter-tag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {selectedMonth} 2026
              <button onClick={() => setSelectedMonth(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </span>
          </div>
        )}

        {/* Filter Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Audience Filter */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <span className="section-label" style={{ margin: 0 }}>I work in...</span>
              {hasActiveFilters && (
                <button className="clear-btn" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {allAudiences.map(audience => (
                <button
                  key={audience}
                  className={`filter-chip ${selectedAudiences.includes(audience) ? 'active' : ''}`}
                  onClick={() => toggleAudience(audience)}
                >
                  {audience}
                </button>
              ))}
            </div>
          </div>

          {/* Area Filter */}
          <div>
            <span className="section-label">I'm interested in...</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {allAreas.map(area => (
                <button
                  key={area}
                  className={`filter-chip ${selectedAreas.includes(area) ? 'active' : ''}`}
                  onClick={() => toggleArea(area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divider with count */}
      <div style={{
        padding: '0 32px',
        maxWidth: '1300px',
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{ 
          flex: 1, 
          height: '1px', 
          background: 'linear-gradient(90deg, #E0DDD8 0%, transparent 100%)' 
        }} />
        <span style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '14px',
          color: '#999',
        }}>
          {filteredContent.length} {filteredContent.length === 1 ? 'article' : 'articles'}
          {selectedMonth && ` in ${selectedMonth}`}
        </span>
        <div style={{ 
          flex: 1, 
          height: '1px', 
          background: 'linear-gradient(90deg, transparent 0%, #E0DDD8 100%)' 
        }} />
      </div>

      {/* Content Grid */}
      <main style={{
        padding: '0 32px 80px',
        maxWidth: '1300px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '24px',
        }}>
          {filteredContent.map((item, index) => (
            <a 
              key={index} 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="content-card"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="card-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '16px' 
              }}>
                <span 
                  className={`month-badge ${selectedMonth === item.month ? 'active' : ''}`}
                  onClick={(e) => handleMonthClick(item.month, e)}
                  title={`Filter by ${item.month}`}
                >
                  {item.month} 2026
                </span>
                {item.badge && <span className="source-badge">{item.badge}</span>}
              </div>
              
              <h2 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '20px',
                fontWeight: 600,
                margin: '0 0 14px 0',
                lineHeight: 1.35,
                color: '#1a1a1a',
                paddingRight: '40px',
              }}>
                {item.topic}
              </h2>
              
              <p style={{
                fontSize: '14px',
                lineHeight: 1.7,
                color: '#666',
                margin: '0 0 20px 0',
              }}>
                {item.summary}
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {item.audience.slice(0, 3).map(a => (
                  <span key={a} className="tag tag-audience">{a}</span>
                ))}
                {item.area.slice(0, 2).map(a => (
                  <span key={a} className="tag tag-area">{a}</span>
                ))}
              </div>
            </a>
          ))}
        </div>

        {filteredContent.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            color: '#999',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#F5F3F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" fill="none" stroke="#999" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '17px', margin: '0 0 8px 0', color: '#666' }}>No articles match your filters</p>
            <p style={{ fontSize: '14px', margin: '0 0 20px 0' }}>Try adjusting your selection</p>
            <button className="clear-btn" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '32px',
        borderTop: '1px solid #E8E5E0',
        background: 'white',
      }}>
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <p style={{
            fontSize: '14px',
            color: '#999',
            margin: 0,
          }}>
            Updated January 2026
          </p>
          <p style={{
            fontSize: '14px',
            color: '#666',
            margin: 0,
          }}>
            Questions? <a href="mailto:Kevin.Boyle@Databricks.com" className="footer-link">Reach out anytime</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
