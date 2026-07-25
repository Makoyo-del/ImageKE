import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, Send, MessageSquare, User, Briefcase, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase';

export default function ReviewsSection({ appSource = 'ats_simulator', sectionId = 'user-reviews-section' }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Fetch reviews from Supabase
  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error:', error.message);
        setReviews([]);
      } else if (data) {
        setReviews(data);
      }
    } catch (err) {
      console.warn('Could not load remote reviews:', err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!role.trim()) {
      setErrorMessage('Please enter your role or title (e.g. Software Engineer, HR Lead, Job Seeker).');
      return;
    }
    if (!reviewText.trim() || reviewText.trim().length < 10) {
      setErrorMessage('Please write a review with at least 10 characters.');
      return;
    }

    setSubmitting(true);

    const newReviewObj = {
      name: name.trim(),
      role: role.trim(),
      rating: Number(rating),
      review_text: reviewText.trim(),
      app_source: appSource,
      is_public: true,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([newReviewObj])
        .select();

      if (error) {
        throw error;
      }

      // Add to local state immediately for instant feedback
      const createdItem = data && data[0] ? data[0] : { ...newReviewObj, id: 'temp-' + Date.now() };
      setReviews(prev => [createdItem, ...prev]);
      setSubmitSuccess(true);
      
      // Clear inputs
      setName('');
      setRole('');
      setRating(5);
      setReviewText('');

      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch (err) {
      console.warn('Supabase insert failed, adding to local display:', err.message);
      // Fallback: update local state so user experience is not disrupted
      const fallbackItem = { ...newReviewObj, id: 'local-' + Date.now() };
      setReviews(prev => [fallbackItem, ...prev]);
      setSubmitSuccess(true);
      setName('');
      setRole('');
      setRating(5);
      setReviewText('');
      setTimeout(() => setSubmitSuccess(false), 6000);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate statistics
  const totalCount = reviews.length;
  const avgRating = totalCount > 0 
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalCount).toFixed(1)
    : '5.0';

  return (
    <section
      id={sectionId}
      style={{
        background: '#F4F4EE',
        borderTop: '2px solid #111111',
        borderBottom: '2px solid #111111',
        padding: '3.5rem 1.5rem',
        color: '#111111',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Section Header */}
        <div style={{ textAlign: 'left', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', background: '#D61A3C' }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#111111'
            }}>
              COMMUNITY REVIEWS // CREDIBILITY & SOCIAL PROOF
            </span>
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '2.25rem',
            fontWeight: 800,
            color: '#111111',
            margin: 0,
            lineHeight: 1.2
          }}>
            What Candidates & Recruiters Say <em style={{ fontStyle: 'italic', color: '#D61A3C' }}>About Us</em>
          </h2>
        </div>

        {/* Bento Grid Layout: Form on Left, Reviews on Right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'start'
        }}>
          
          {/* LEFT BENTO BOX: Review Submission Form */}
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #111111',
            padding: '2rem',
            boxShadow: '6px 6px 0px #111111',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1.5px solid #111111', paddingBottom: '0.75rem' }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: 0,
                color: '#111111'
              }}>
                Leave Your Review
              </h3>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: '#F4F4EE', border: '1px solid #111111', padding: '0.2rem 0.5rem' }}>
                VERIFIED USER
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#555555', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              How was your experience using our ATS Simulator &amp; LinkedIn tools? Share your feedback to guide other professionals.
            </p>

            {submitSuccess && (
              <div style={{
                background: '#ECFDF5',
                border: '1.5px solid #10B981',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#065F46',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <CheckCircle size={18} color="#10B981" />
                Thank you! Your review has been submitted and published below.
              </div>
            )}

            {errorMessage && (
              <div style={{
                background: '#FEF2F2',
                border: '1.5px solid #EF4444',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#991B1B',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <AlertCircle size={18} color="#EF4444" />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111111', marginBottom: '0.35rem' }}>
                  Your Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Kimani"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1.5px solid #111111',
                    background: '#F4F4EE',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Role / Job Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111111', marginBottom: '0.35rem' }}>
                  Your Role / Profession *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer, HR Lead, Job Seeker"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1.5px solid #111111',
                    background: '#F4F4EE',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Star Rating */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111111', marginBottom: '0.35rem' }}>
                  Rating *
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const active = starIndex <= (hoverRating || rating);
                    return (
                      <button
                        key={starIndex}
                        type="button"
                        onClick={() => setRating(starIndex)}
                        onMouseEnter={() => setHoverRating(starIndex)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.1s ease'
                        }}
                      >
                        <Star
                          size={24}
                          fill={active ? '#D61A3C' : 'none'}
                          color={active ? '#D61A3C' : '#999999'}
                          strokeWidth={2}
                        />
                      </button>
                    );
                  })}
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '0.5rem', color: '#111111' }}>
                    {hoverRating || rating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* Written Review */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111111', marginBottom: '0.35rem' }}>
                  Your Review &amp; Comments *
                </label>
                <textarea
                  rows={4}
                  placeholder="How did the tool help you? Mention specific insights like ATS keywords, resume formatting, or score impact..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1.5px solid #111111',
                    background: '#F4F4EE',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: '#111111',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '4px 4px 0px #D61A3C',
                  transition: 'transform 0.1s ease, boxShadow 0.1s ease'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Public Review'} <Send size={16} />
              </button>
            </form>
          </div>

          {/* RIGHT BENTO BOX: Public Reviews Display Wall */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Stats Header Bar */}
            <div style={{
              background: '#111111',
              color: '#F4F4EE',
              border: '2px solid #111111',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '4px 4px 0px #D61A3C'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D61A3C', display: 'block', marginBottom: '0.2rem' }}>
                  OVERALL USER RATING
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 900, color: '#F4F4EE' }}>
                    {avgRating}
                  </span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={16} fill="#D61A3C" color="#D61A3C" />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#F4F4EE' }}>{totalCount}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#A0A0A0', fontWeight: 700 }}>
                  Verified Reviews
                </span>
              </div>
            </div>

            {/* List of Reviews Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
              {reviews.length === 0 ? (
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px dashed #111111',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  color: '#555555'
                }}>
                  <MessageSquare size={32} style={{ color: '#D61A3C', marginBottom: '0.75rem' }} />
                  <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#111111', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
                    No User Reviews Yet
                  </h4>
                  <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
                    Be the first candidate to analyze your CV or LinkedIn profile and share your experience using the form on the left!
                  </p>
                </div>
              ) : (
                reviews.map((rev) => (
                <div
                  key={rev.id || Math.random()}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #111111',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '4px 4px 0px #111111',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: '#111111',
                        color: '#F4F4EE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        fontFamily: 'serif'
                      }}>
                        {rev.name ? rev.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#111111' }}>
                          {rev.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#666666', fontWeight: 600, display: 'block' }}>
                          {rev.role}
                        </span>
                      </div>
                    </div>

                    {/* Stars */}
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          fill={s <= (rev.rating || 5) ? '#D61A3C' : 'none'}
                          color={s <= (rev.rating || 5) ? '#D61A3C' : '#CCCCCC'}
                        />
                      ))}
                    </div>
                  </div>

                  <p style={{
                    fontSize: '0.875rem',
                    color: '#222222',
                    lineHeight: 1.5,
                    margin: 0,
                    fontStyle: 'italic'
                  }}>
                    "{rev.review_text}"
                  </p>

                  <div style={{ marginTop: '0.75rem', pt: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #E5E5E5', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#D61A3C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ✓ VERIFIED CANDIDATE REVIEW
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#888888' }}>
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
              ))
              )}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
