export function calculateScores(parsedData) {
  if (!parsedData) return { parsingAccuracy: 0, sectionScore: 0, keywordScore: 0, formattingScore: 0, overallScore: 0 };

  // DIRECTIVE 2: Parsing Accuracy (Base: 100, Floor: 0)
  let parsingAccuracy = 100;
  if (parsedData.formatting?.isLikelyScanned) parsingAccuracy -= 50;
  if (!parsedData.contact?.name) parsingAccuracy -= 25;
  if (!parsedData.contact?.email) parsingAccuracy -= 25;
  if (!parsedData.contact?.phone) parsingAccuracy -= 20;
  parsingAccuracy = Math.max(0, parsingAccuracy);

  // DIRECTIVE 3: Section Recognition Score (Base: 100, Floor: 0)
  let sectionScore = 100;
  if (!parsedData.sections?.experience) sectionScore -= 30;
  const hasEducation = parsedData.hasEducation ?? (parsedData.sections?.education ?? false);
  if (!hasEducation) sectionScore -= 20;
  if (!parsedData.sections?.skills) sectionScore -= 15;
  if (!parsedData.sections?.summary) sectionScore -= 15;
  if (parsedData.formatting?.hasCreativeHeadings) sectionScore -= 15;
  sectionScore = Math.max(0, sectionScore);

  // DIRECTIVE 5: Hybrid Keyword & Impact Score (Max: 100)
  const skillsCount = Array.isArray(parsedData.skills) ? parsedData.skills.length : 0;
  const skillsComponent = Math.min(50, Math.round((skillsCount / 12) * 50));

  let impactPoints = 0;
  const expEval = parsedData.experienceEvaluation || {};
  const usesStarMethod = expEval.usesStarMethod ?? parsedData.hasAchievements ?? false;
  const hasMetrics = expEval.hasMetrics ?? parsedData.hasAchievements ?? false;

  if (usesStarMethod) impactPoints += 20;
  if (hasMetrics) impactPoints += 20;
  if (expEval.boldsFirstWords || expEval.boldsMetrics) impactPoints += 10;
  const impactComponent = Math.min(50, impactPoints);

  const keywordScore = Math.min(100, skillsComponent + impactComponent);

  // DIRECTIVE 4: Formatting Safety & Risk Score (Base: 100, Floor: 0)
  let formattingDeductions = 0;
  // Major structural ATS breakers (-25 each)
  if (parsedData.formatting?.multiColumnRisk) formattingDeductions += 25;
  if (parsedData.formatting?.hasTables) formattingDeductions += 25;
  if (parsedData.formatting?.hasTextBoxes) formattingDeductions += 25;
  if (parsedData.formatting?.hasGraphics) formattingDeductions += 25;

  // Privacy liabilities (-20 each)
  const hasPhoto = parsedData.contact?.hasPhoto || parsedData.hasImagesInDocx || false;
  if (hasPhoto) formattingDeductions += 20;
  if (parsedData.contact?.hasIDNumber) formattingDeductions += 20;
  if (parsedData.contact?.hasDOB) formattingDeductions += 20;

  // Minor layout risks (-10 each)
  if (parsedData.formatting?.hasSpecialBullets) formattingDeductions += 10;
  if (parsedData.formatting?.hasColoredTextOrBg) formattingDeductions += 10;

  const formattingScore = Math.max(0, 100 - formattingDeductions);

  // DIRECTIVE 1: Equalized Overall Score Weighting (25% each)
  const overallScore = Math.round(
    parsingAccuracy * 0.25 +
    sectionScore * 0.25 +
    keywordScore * 0.25 +
    formattingScore * 0.25
  );

  return {
    parsingAccuracy,
    sectionScore,
    keywordScore,
    formattingScore,
    overallScore
  };
}
