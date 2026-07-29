import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScores } from '../src/utils/calculateScores.js';

describe('ATS Scoring Engine - Unit Tests', () => {

  it('1. Perfect Executive Resume - should achieve near 100% overall score', () => {
    const mockPerfectExecutive = {
      contact: {
        name: 'Emilia Zubornyak',
        email: 'emilia@example.com',
        phone: '+49-175-324-6590',
        linkedin: 'linkedin.com/in/emilia',
        hasPhoto: false,
        hasDOB: false,
        hasMaritalStatus: false,
        hasIDNumber: false,
        hasFullAddress: false,
      },
      sections: {
        summary: true,
        experience: true,
        education: true,
        skills: true,
        certifications: true,
        languages: true,
        achievements: true,
        references: true,
      },
      hasEducation: true,
      skills: [
        'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS',
        'Docker', 'Kubernetes', 'Agile', 'DevOps', 'GraphQL', 'TypeScript'
      ],
      formatting: {
        isLikelyScanned: false,
        multiColumnRisk: false,
        hasTables: false,
        hasGraphics: false,
        hasTextBoxes: false,
        hasSpecialBullets: false,
        hasColoredTextOrBg: false,
        hasCreativeHeadings: false,
      },
      experienceEvaluation: {
        usesStarMethod: true,
        hasMetrics: true,
        boldsFirstWords: true,
        boldsMetrics: true,
      },
      hasAchievements: true,
    };

    const scores = calculateScores(mockPerfectExecutive);

    assert.equal(scores.parsingAccuracy, 100);
    assert.equal(scores.sectionScore, 100);
    assert.equal(scores.keywordScore, 100);
    assert.equal(scores.formattingScore, 100);
    assert.equal(scores.overallScore, 100);
  });

  it('2. Bad Formatting Resume - should trigger major deductions and floor sub-scores at 0', () => {
    const mockBadFormatting = {
      contact: {
        name: null,
        email: null,
        phone: null,
        hasPhoto: true,
        hasIDNumber: true,
        hasDOB: true,
      },
      sections: {
        summary: false,
        experience: false,
        education: false,
        skills: false,
      },
      hasEducation: false,
      skills: [],
      formatting: {
        isLikelyScanned: true,
        multiColumnRisk: true,
        hasTables: true,
        hasGraphics: true,
        hasTextBoxes: true,
        hasSpecialBullets: true,
        hasColoredTextOrBg: true,
        hasCreativeHeadings: true,
      },
      experienceEvaluation: {
        usesStarMethod: false,
        hasMetrics: false,
        boldsFirstWords: false,
        boldsMetrics: false,
      },
    };

    const scores = calculateScores(mockBadFormatting);

    // Assert sub-scores reflect heavy deductions
    assert.equal(scores.parsingAccuracy, 0);
    assert.equal(scores.sectionScore, 5); // 100 - 30(exp) - 20(edu) - 15(skills) - 15(sum) - 15(creativeHeaders) = 5
    assert.equal(scores.keywordScore, 0);
    assert.equal(scores.formattingScore, 0);
    assert.equal(scores.overallScore, 1); // 25% of 5 rounded = 1
  });

  it('3. Missing Impact Resume - should score high on keywords & formatting but lose impact points', () => {
    const mockMissingImpact = {
      contact: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+254712345678',
        hasPhoto: false,
        hasIDNumber: false,
        hasDOB: false,
      },
      sections: {
        summary: true,
        experience: true,
        education: true,
        skills: true,
      },
      hasEducation: true,
      skills: [
        'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS',
        'Docker', 'Kubernetes', 'Agile', 'DevOps', 'GraphQL', 'TypeScript'
      ],
      formatting: {
        isLikelyScanned: false,
        multiColumnRisk: false,
        hasTables: false,
        hasGraphics: false,
        hasTextBoxes: false,
      },
      experienceEvaluation: {
        usesStarMethod: false,
        hasMetrics: false,
        boldsFirstWords: false,
        boldsMetrics: false,
      },
      hasAchievements: false,
    };

    const scores = calculateScores(mockMissingImpact);

    assert.equal(scores.parsingAccuracy, 100);
    assert.equal(scores.sectionScore, 100);
    assert.equal(scores.formattingScore, 100);
    // Skills component = 50, Impact component = 0 -> keywordScore = 50
    assert.equal(scores.keywordScore, 50);
    // Overall = 25% of 100 + 25% of 100 + 25% of 50 + 25% of 100 = 87.5 -> rounded to 88
    assert.equal(scores.overallScore, 88);
  });

  it('4. Null Safety & Equal Weighting Verification', () => {
    const nullScores = calculateScores(null);
    assert.equal(nullScores.overallScore, 0);
    assert.equal(nullScores.parsingAccuracy, 0);

    // Verify 4-pillar equal weighting math (25% each)
    const customParse = {
      contact: { name: 'Test User', email: 'test@example.com', phone: '+1234567890' },
      sections: { summary: true, experience: true, education: true, skills: true },
      hasEducation: true,
      skills: [],
      formatting: { multiColumnRisk: true, hasTables: true, hasGraphics: true, hasTextBoxes: true }, // formatting = 0
      experienceEvaluation: { usesStarMethod: false, hasMetrics: false }
    };
    const s = calculateScores(customParse);
    // parsingAccuracy = 100, sectionScore = 100, keywordScore = 0, formattingScore = 0
    // Expected overall = 100*0.25 + 100*0.25 + 0*0.25 + 0*0.25 = 50
    assert.equal(s.overallScore, 50);
  });

});
