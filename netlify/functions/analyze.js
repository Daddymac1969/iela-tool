const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    let assessmentData;
    try {
      assessmentData = JSON.parse(event.body);
    } catch (parseError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }

    const { demographics, ratings, context: userContext } = assessmentData;

    if (!ratings || Object.keys(ratings).length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No ratings provided' }) };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured. Please add ANTHROPIC_API_KEY to Netlify environment variables.' }) };
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = buildPrompt(demographics, ratings, userContext);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }]
    });

    const analysis = message.content[0].text;

    return { statusCode: 200, headers, body: JSON.stringify({ analysis }) };

  } catch (error) {
    console.error('Function error:', error);

    let errorMessage = 'Failed to generate analysis. Please try again.';
    let statusCode = 500;

    if (error.status === 401) {
      errorMessage = 'Invalid API key. Please check your ANTHROPIC_API_KEY in Netlify environment variables.';
    } else if (error.status === 429) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    return { statusCode, headers, body: JSON.stringify({ error: errorMessage, details: error.message }) };
  }
};

function buildPrompt(demographics = {}, ratings = {}, userContext = {}) {
  const roleLabels = {
    'head': 'Head of School / Principal',
    'slt': 'Senior Leadership Team',
    'inclusion_lead': 'Inclusion / DEI Lead',
    'safeguarding_lead': 'Safeguarding Lead / DSL',
    'middle_leader': 'Middle Leader / Head of Department',
    'teacher': 'Classroom Teacher',
    'pastoral': 'Pastoral / Wellbeing Lead',
    'governor': 'Governor / Trustee',
    'other': 'Other'
  };

  const studentCountLabels = {
    'under_100': 'Under 100', '100_300': '100-300', '300_500': '300-500',
    '500_800': '500-800', '800_1200': '800-1,200', 'over_1200': 'Over 1,200'
  };

  const schoolTypeLabels = {
    'inner_city': 'Inner City / Urban', 'suburban': 'Suburban',
    'rural': 'Rural', 'international': 'International'
  };

  let contextSection = '';
  if (userContext && Object.values(userContext).some(v => v && v.trim())) {
    contextSection = '\n\nADDITIONAL CONTEXT:\n';
    if (userContext.mission?.trim()) contextSection += `\nMission & Values: ${userContext.mission}`;
    if (userContext.policy?.trim()) contextSection += `\nPolicy: ${userContext.policy}`;
    if (userContext.curriculum?.trim()) contextSection += `\nCurriculum: ${userContext.curriculum}`;
    if (userContext.culture?.trim()) contextSection += `\nCulture: ${userContext.culture}`;
    if (userContext.student?.trim()) contextSection += `\nStudent Experience: ${userContext.student}`;
    if (userContext.overall?.trim()) contextSection += `\nOverall: ${userContext.overall}`;
  }

  return `You are an expert in school inclusion, equity, diversity, and safeguarding, specialising in the RESPOND framework and C.OM.PAs approach from TASIS England.

RESPOND FRAMEWORK - THE 7 STEPS:
R - Recognise | E - Engage | S - Support | P - Pause | O - Offer | N - Notify | D - Document

C.OM.PAs: Compassionate | Open-minded | Principled Actions

THE GOLDEN THREAD:
Values (C.OM.PAs) -> Policy -> Curriculum/Teaching -> Culture (Adults) -> Student Experience

Inclusion is only "lived" when it reaches the student experience level.

---

SCHOOL CONTEXT:
- Role: ${roleLabels[demographics.yourRole] || 'Not specified'}
- Students: ${studentCountLabels[demographics.studentCount] || 'Not specified'}
- Setting: ${schoolTypeLabels[demographics.schoolType] || 'Not specified'}
- Model: ${demographics.schoolModel?.join(', ') || 'Not specified'}
- Sector: ${demographics.schoolSector || 'Not specified'}
- Ages: ${demographics.ageRanges?.join(', ') || 'Not specified'}
- Qualifications: ${demographics.qualifications?.join(', ') || 'Not specified'}

ASSESSMENT SCORES (1=lowest, 5=highest):
Mission & Values: ${ratings.mission_explicit}/5, ${ratings.leadership_models}/5
Policy: ${ratings.policy_specific}/5, ${ratings.policy_reviewed}/5, ${ratings.policy_accessible}/5
Curriculum & Teaching: ${ratings.curriculum_diverse}/5, ${ratings.curriculum_embedded}/5, ${ratings.teacher_training}/5
Culture & Relationships: ${ratings.staff_challenge}/5, ${ratings.students_valued}/5, ${ratings.trust_response}/5
Student Experience: ${ratings.student_trust}/5, ${ratings.student_voice}/5, ${ratings.student_perception}/5
${contextSection}

Provide analysis in HTML using British English. Structure:

<h2>Overall Assessment</h2>
<p>[2-3 sentence summary. Key strengths and critical gaps mapped to the Golden Thread.]</p>

<h2>Gap Analysis</h2>
<p>[Where the Golden Thread breaks down across the five levels. Be specific about which scores reveal the weakest links.]</p>

<h2>Top 3 Priorities</h2>
<div class="action-plan"><h3><span class="priority-badge priority-high">HIGH</span> [Area]</h3><p>[Why it matters and RESPOND/C.OM.PAs connection.]</p></div>
<div class="action-plan"><h3><span class="priority-badge priority-medium">MEDIUM</span> [Area]</h3><p>[Why it matters.]</p></div>
<div class="action-plan"><h3><span class="priority-badge priority-low">LOW</span> [Area]</h3><p>[Why it matters.]</p></div>

<h2>30-Day Actions</h2>
<div class="action-plan"><h3>Action 1: [Specific action for HIGH priority]</h3><p><strong>Who:</strong> [Role] | <strong>What:</strong> [Concrete steps] | <strong>Quick win:</strong> [This week]</p></div>
<div class="action-plan"><h3>Action 2: [Specific action for MEDIUM priority]</h3><p><strong>Who:</strong> [Role] | <strong>What:</strong> [Concrete steps] | <strong>Quick win:</strong> [This week]</p></div>
<div class="action-plan"><h3>Action 3: [Specific action for LOW priority]</h3><p><strong>Who:</strong> [Role] | <strong>What:</strong> [Concrete steps] | <strong>Quick win:</strong> [This week]</p></div>

<h2>Context-Specific Insight</h2>
<div class="insight-box"><p>[3 tailored observations for their specific school context, size and sector.]</p></div>

<h2>Resources</h2>
<p><strong>RESPOND Framework:</strong> <a href="https://www.respondsafeguarding.org" target="_blank">www.respondsafeguarding.org</a></p>
<p><strong>Contact:</strong> dsinghmacpherson@tasisengland.org or cwilliams@tasisengland.org</p>

<div class="insight-box"><h3>Next Steps</h3><p>[Months 2-3 goals and one cultural shift to aim for.]</p></div>

CRITICAL: British English. Reference RESPOND and C.OM.PAs. 1200-1500 words. Actionable and specific.`;
}
