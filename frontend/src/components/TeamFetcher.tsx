import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Users } from 'lucide-react';

// Mock function to simulate fetching team members
async function fetchTeams(count: number): Promise<string[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve([...Array(count)].map((_, i) => `Team Member ${i + 1}`));
    }, 500)
  );
}

export function TeamFetcher() {
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [hasData, setHasData] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const members = await fetchTeams(count);
      setTeamMembers(members);
      setHasData(true);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setCount(Math.max(1, Math.min(100, value))); // Clamp between 1-100
  };

  return (
    <div className="team-fetcher-container" style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <Users size={28} style={{ color: '#3b82f6' }} />
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1e293b',
          margin: 0,
        }}>
          Team Fetcher
        </h2>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <label htmlFor="team-count" style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#64748b',
          }}>
            Number of Members
          </label>
          <input
            id="team-count"
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={handleCountChange}
            disabled={loading}
            style={{
              padding: '10px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.2s',
              cursor: loading ? 'not-allowed' : 'text',
              opacity: loading ? 0.6 : 1,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Refetch Button */}
        <motion.button
          onClick={handleFetch}
          disabled={loading}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            marginTop: '22px',
            background: loading
              ? '#94a3b8'
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s',
          }}
        >
          <motion.div
            animate={loading ? { rotate: 360 } : { rotate: 0 }}
            transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          >
            <RefreshCw size={16} />
          </motion.div>
          {loading ? 'Fetching...' : 'Refetch'}
        </motion.button>
      </div>

      {/* Results */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
          }}>
            Found {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}>
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                style={{
                  padding: '14px 16px',
                  borderBottom: index < teamMembers.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  flexShrink: 0,
                }}>
                  {index + 1}
                </div>
                <span style={{
                  fontSize: '14px',
                  color: '#1e293b',
                  fontWeight: '500',
                }}>
                  {member}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!hasData && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#94a3b8',
          fontSize: '14px',
        }}>
          <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ margin: 0 }}>
            Click "Refetch" to load team members
          </p>
        </div>
      )}
    </div>
  );
}
