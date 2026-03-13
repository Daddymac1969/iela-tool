const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event, context) => {
  // Increase function timeout
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const assessmentData = JSON.parse(event.body);
    const { demographics, ratings, context: userContext } = assessmentData;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = buildPrompt(demographics, ratings, userContext);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000, // Increased from 4000
      messages: [{ role: "user", content: prompt }],
      timeout: 120000 // 120 second timeout
    });

    const analysis = message.content[0].text;

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ analysis })
    };

  } catch (error) {
    console.error('Error:', error);
    
    // Better error handling
    let errorMessage = 'Failed to generate analysis';
    if (error.message.includes('timeout')) {
      errorMessage = 'Analysis took too long. Please try again with fewer optional context fields.';
    } else if (error.status === 429) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      })
    };
  }
};

function buildPrompt(demographics, ratings, userContext) {
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
    'under_100': 'Under 100',
    '100_300': '100-300',
    '300_500': '300-500',
    '500_800': '500-800',
    '800_1200': '800-1,200',
    'over_1200': 'Over 1,200'
  };

  const schoolTypeLabels = {
    'inner_city': 'Inner City / Urban',
    'suburban': 'Suburban',
    'rural': 'Rural',
    'international': 'International'
  };

  // Build context sections if provided
  let contextSection = '';
  if (userContext && Object.values(userContext).some(v => v)) {
    contextSection = '\n\nADDITIONAL CONTEXT PROVIDED BY USER:\n';
    if (userContext.mission) contextSection += `\nMission & Values Context: ${userContext.mission}`;
    if (userContext.policy) contextSection += `\nPolicy Context: ${userContext.policy}`;
    if (userContext.curriculum) contextSection += `\nCurriculum Context: ${userContext.curriculum}`;
    if (userContext.culture) contextSection += `\nCulture Context: ${userContext.culture}`;
    if (userContext.student) contextSection += `\nStudent Experience Context: ${userContext.student}`;
    if (userContext.overall) contextSection += `\nOverall Priorities & Context: ${userContext.overall}`;
  }

  return `You are an expert in school inclusion, equity, diversity, and safeguarding, specialising in the RESPOND framework and C.OM.PAs (Compassionate, Open-minded, Principled Actions) approach from TASIS England.

RESPOND FRAMEWORK - THE 7 STEPS:
The RESPOND framework is a trauma-informed, relational safeguarding approach developed at TASIS England that bridges the gap between policy and practice.

R – Recognise | E – Engage | S – Support | P – Pause | O – Offer | N – Notify | D – Document

KEY RESPOND PRINCIPLES: Trauma-informed, Relational, Contextual, Culturally sensitive without being culturally inactive, Practice-focused

C.OM.PAs FRAMEWORK:
Compassionate | Open-minded | Principled Actions

THE GOLDEN THREAD:
Values (C.OM.PAs) → Policy → Curriculum/Teaching → Culture (Adults) → Student Experience

Inclusion is only "lived" when it reaches the student experience level.

---

SCHOOL CONTEXT:
- Role: ${roleLabels[demographics.yourRole] || 'Not specified'}
- Student count: ${studentCountLabels[demographics.studentCount] || 'Not specified'}
- Setting: ${schoolTypeLabels[demographics.schoolType] || 'Not specified'}
- Model: ${demographics.schoolModel?.join(', ') || 'Not specified'}
- Sector: ${demographics.schoolSector || 'Not specified'}
- Age ranges: ${demographics.ageRanges?.join(', ') || 'Not specified'}
- Qualifications: ${demographics.qualifications?.join(', ') || 'Not specified'}

ASSESSMENT SCORES (1=lowest, 5=highest):

**Mission & Values:** ${ratings.mission_explicit}/5, ${ratings.leadership_models}/5
**Policy:** ${ratings.policy_specific}/5, ${ratings.policy_reviewed}/5, ${ratings.policy_accessible}/5
**Curriculum:** ${ratings.curriculum_diverse}/5, ${ratings.curriculum_embedded}/5, ${ratings.teacher_training}/5
**Culture:** ${ratings.staff_challenge}/5, ${ratings.students_valued}/5, ${ratings.trust_response}/5
**Student Experience:** ${ratings.student_trust}/5, ${ratings.student_voice}/5, ${ratings.student_perception}/5
${contextSection}

Provide a comprehensive analysis in HTML. Use British English spelling. Structure:

<h2>🎯 Overall Assessment</h2>
[Brief summary mapping scores to Golden Thread with 2-3 strengths and critical gaps]

<h2>🔍 Gap Analysis by Level</h2>
[Mission & Values, Policy, Curriculum, Culture, Student Experience - what scores reveal about Golden Thread flow]

<h2>🚨 Priority Areas</h2>
[3 priorities with HIGH/MEDIUM/LOW badges, why they matter, context-specific concerns, RESPOND/C.OM.PAs connections]

<h2>📋 30-Day Action Plan</h2>
[3 concrete actions applying RESPOND/C.OM.PAs with: principle applied, who, what, success criteria, time, resources, quick win]

<h2>💡 Context-Specific Insights</h2>
<div class="insight-box">
[Tailored recommendations for their specific context - setting, size, qualifications]
</div>

<h2>🎓 Next Steps Beyond 30 Days</h2>
[Months 2-3, 4-6, Cultural Shifts]

<h2>📚 Resources</h2>
<p><strong>RESPOND:</strong> <a href="https://www.respondsafeguarding.org">www.respondsafeguarding.org</a></p>
<p><strong>Contact:</strong> dsinghmacpherson@tasisengland.org or cwilliams@tasisengland.org</p>

<div class="insight-box">
<h3>✅ Final Encouragement</h3>
[Personalised message for their role and context, emphasising stated→lived journey]
</div>

CRITICAL: British English throughout. Reference RESPOND and C.OM.PAs. Map to Golden Thread. 2000-2500 words. Actionable and specific.`;
}
