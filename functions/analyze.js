const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('Starting analysis...');
    
    // Parse request body
    let assessmentData;
    try {
      assessmentData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { demographics, ratings, context: userContext } = assessmentData;

    // Validate required data
    if (!ratings || Object.keys(ratings).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No ratings provided' })
      };
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'API key not configured. Please add ANTHROPIC_API_KEY to Netlify environment variables.' 
        })
      };
    }

    console.log('Initializing Anthropic client...');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('Building prompt...');
    const prompt = buildPrompt(demographics, ratings, userContext);

    console.log('Calling Anthropic API...');
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }]
      // REMOVED: timeout parameter - not supported by Anthropic API
    });

    console.log('Analysis complete');
    const analysis = message.content[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis })
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    
    let errorMessage = 'Failed to generate analysis';
    let statusCode = 500;

    if (error.status === 401) {
      errorMessage = 'Invalid API key. Please check your ANTHROPIC_API_KEY in Netlify environment variables.';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Could not connect to Anthropic API. Please check your internet connection.';
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message,
        type: error.constructor.name
      })
    };
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
    'pastoral': 'Wellbeing Lead',
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
  if (userContext && Object.values(userContext).some(v => v && v.trim())) {
    contextSection = '\n\nADDITIONAL CONTEXT PROVIDED:\n';
    if (userContext.mission?.trim()) contextSection += `\nMission & Values: ${userContext.mission}`;
    if (userContext.policy?.trim()) contextSection += `\nPolicy: ${userContext.policy}`;
    if (userContext.curriculum?.trim()) contextSection += `\nCurriculum: ${userContext.curriculum}`;
    if (userContext.culture?.trim()) contextSection += `\nCulture: ${userContext.culture}`;
    if (userContext.student?.trim()) contextSection += `\nStudent Experience: ${userContext.student}`;
    if (userContext.overall?.trim()) contextSection += `\nOverall: ${userContext.overall}`;
  }

  return `You are an expert in school inclusion, equity, diversity, and safeguarding, specialising in the RESPOND framework and C.OM.PAs approach from TASIS England.

RESPOND FRAMEWORK - THE 7 STEPS:
R – Recognise: Identify concerns, disclosures, or signs that a child may need support
E – Engage: Listen actively and build trust. Create a safe space for the child to share
S – Support: Provide immediate emotional and practical support. Validate their experience
P – Pause: Take time to think before acting. Avoid reactive decisions
O – Offer: Present options and next steps. Empower the child where possible
N – Notify: Follow safeguarding procedures. Report to DSL/appropriate authorities
D – Document: Record accurately, factually, and contemporaneously

KEY PRINCIPLES: Trauma-informed, Relational, Contextual, Culturally sensitive without being culturally inactive, Practice-focused

C.OM.PAs FRAMEWORK:
Compassionate: Genuine empathy in every interaction
Open-minded: Actively challenging our own assumptions and biases
Principled Actions: Doing the right thing, even when it's difficult

THE GOLDEN THREAD:
Values (C.OM.PAs) → Policy → Curriculum/Teaching → Culture (Adults) → Student Experience

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

**Mission & Values:**
1. Mission includes explicit inclusion commitments: ${ratings.mission_explicit}/5
2. Leadership models inclusive behaviour: ${ratings.leadership_models}/5

**Policy:**
3. Policies contain specific, actionable commitments: ${ratings.policy_specific}/5
4. Policies reviewed annually: ${ratings.policy_reviewed}/5
5. Policies accessible to staff: ${ratings.policy_accessible}/5

**Curriculum & Teaching:**
6. Curriculum reflects diverse perspectives: ${ratings.curriculum_diverse}/5
7. Inclusion embedded across subjects: ${ratings.curriculum_embedded}/5
8. Teachers receive regular training: ${ratings.teacher_training}/5

**Culture & Relationships:**
9. Staff challenge bias/exclusionary language: ${ratings.staff_challenge}/5
10. Students from minoritised backgrounds feel valued: ${ratings.students_valued}/5
11. Families trust response process: ${ratings.trust_response}/5

**Student Experience:**
12. Students can name trusted adults: ${ratings.student_trust}/5
13. School systematically collects student voice: ${ratings.student_voice}/5
14. Students say school genuinely values everyone: ${ratings.student_perception}/5
${contextSection}

TASK:
Provide a comprehensive analysis structured with HTML formatting. CRITICAL: Use British English spelling throughout (behaviour, recognise, analyse, organisation, centre, practise as verb/practice as noun, whilst, amongst, etc.):

<h2>🎯 Overall Assessment</h2>
<p>Brief summary of where this school is on the stated→lived inclusion journey. Map their scores against the Golden Thread. Identify 2-3 key strengths to build on and the most critical gaps.</p>

<h2>🔍 Detailed Gap Analysis</h2>

<h3>Mission & Values Level</h3>
<p>What scores ${ratings.mission_explicit} and ${ratings.leadership_models} reveal about leadership commitment. Are C.OM.PAs principles visible at the top?</p>

<h3>Policy Level</h3>
<p>What scores ${ratings.policy_specific}, ${ratings.policy_reviewed}, and ${ratings.policy_accessible} indicate. Do policies enable staff to apply RESPOND principles?</p>

<h3>Curriculum & Teaching Level</h3>
<p>What scores ${ratings.curriculum_diverse}, ${ratings.curriculum_embedded}, and ${ratings.teacher_training} show. Are staff equipped to apply C.OM.PAs and RESPOND?</p>

<h3>Culture & Relationships Level</h3>
<p>What scores ${ratings.staff_challenge}, ${ratings.students_valued}, and ${ratings.trust_response} reveal. Where stated values become lived practice or remain rhetoric.</p>

<h3>Student Experience Level (The Ultimate Measure)</h3>
<p>What scores ${ratings.student_trust}, ${ratings.student_voice}, and ${ratings.student_perception} reveal. Where the Golden Thread succeeds or breaks.</p>

<h2>🚨 Priority Areas</h2>
<p>Identify 3 priority areas based on where the Golden Thread breaks down:</p>

<div class="action-plan">
<h3><span class="priority-badge priority-high">HIGH PRIORITY</span> [Area Name]</h3>
<p><strong>Why this matters:</strong> [Explain the gap and its impact on the Golden Thread]</p>
<p><strong>Specific concern for your context:</strong> [Tailor to their demographics]</p>
<p><strong>RESPOND/C.OM.PAs connection:</strong> [How this priority relates to the frameworks]</p>
</div>

<div class="action-plan">
<h3><span class="priority-badge priority-medium">MEDIUM PRIORITY</span> [Area Name]</h3>
<p><strong>Why this matters:</strong> [Impact]</p>
<p><strong>Context:</strong> [Tailored]</p>
<p><strong>Framework link:</strong> [RESPOND/C.OM.PAs]</p>
</div>

<div class="action-plan">
<h3><span class="priority-badge priority-low">LOW PRIORITY</span> [Area Name]</h3>
<p><strong>Why this matters:</strong> [Impact]</p>
<p><strong>Context:</strong> [Tailored]</p>
<p><strong>Framework link:</strong> [RESPOND/C.OM.PAs]</p>
</div>

<h2>📋 30-Day Action Plan</h2>
<p>For EACH priority area, provide a concrete action that applies C.OM.PAs or RESPOND principles:</p>

<div class="action-plan">
<h3>Action 1: [Specific, measurable action for HIGH priority]</h3>
<p><strong>RESPOND/C.OM.PAs principle applied:</strong> [Which framework step/principle this addresses]</p>
<p><strong>Who:</strong> [Specific roles - reference their role: ${roleLabels[demographics.yourRole]}]</p>
<p><strong>What:</strong> [Detailed steps that operationalise the framework]</p>
<p><strong>Success criteria:</strong> [How you'll know the Golden Thread is strengthening]</p>
<p><strong>Time commitment:</strong> [Realistic estimate]</p>
<p><strong>Resources needed:</strong> [What they'll need]</p>
<p><strong>Quick win tip:</strong> [One thing they can do this week that embodies C.OM.PAs]</p>
</div>

<div class="action-plan">
<h3>Action 2: [Specific action for MEDIUM priority]</h3>
<p><strong>RESPOND/C.OM.PAs principle:</strong> [Which principle]</p>
<p><strong>Who:</strong> [Roles]</p>
<p><strong>What:</strong> [Steps]</p>
<p><strong>Success criteria:</strong> [How to measure]</p>
<p><strong>Time:</strong> [Estimate]</p>
<p><strong>Resources:</strong> [Needed]</p>
<p><strong>Quick win:</strong> [This week]</p>
</div>

<div class="action-plan">
<h3>Action 3: [Specific action for LOW priority]</h3>
<p><strong>RESPOND/C.OM.PAs principle:</strong> [Which principle]</p>
<p><strong>Who:</strong> [Roles]</p>
<p><strong>What:</strong> [Steps]</p>
<p><strong>Success criteria:</strong> [How to measure]</p>
<p><strong>Time:</strong> [Estimate]</p>
<p><strong>Resources:</strong> [Needed]</p>
<p><strong>Quick win:</strong> [This week]</p>
</div>

<h2>💡 Context-Specific Insights</h2>
<div class="insight-box">
<h3>Tailored Recommendations</h3>
<p>Based on being a ${demographics.schoolType || 'school'} ${demographics.schoolModel?.join(' and ') || 'school'} with ${demographics.studentCount || 'students'} offering ${demographics.qualifications?.join(' and ') || 'qualifications'}:</p>
<ul>
<li>[Specific insight 1 - how their context affects Golden Thread flow]</li>
<li>[Specific insight 2 - RESPOND/C.OM.PAs application in their setting]</li>
<li>[Specific insight 3 - unique opportunities or challenges]</li>
</ul>
</div>

<h2>🎓 Next Steps Beyond 30 Days</h2>
<p><strong>Months 2-3:</strong> [Medium-term goals]</p>
<p><strong>Months 4-6:</strong> [Systems to build]</p>
<p><strong>Cultural Shifts:</strong> [Long-term aspirations]</p>

<h2>📚 Resources & Further Learning</h2>
<p><strong>RESPOND Framework:</strong> Visit <a href="https://www.respondsafeguarding.org" target="_blank">www.respondsafeguarding.org</a> for free resources, scenario libraries, and training materials.</p>
<p><strong>TASIS England Inclusion Team:</strong> Contact dsinghmacpherson@tasisengland.org or cwilliams@tasisengland.org for support.</p>

<div class="insight-box">
<h3>✅ Final Encouragement</h3>
<p>Personalised message acknowledging where they are on the stated→lived journey. Reference their specific role (${roleLabels[demographics.yourRole]}) and context. Emphasise that gaps are opportunities, and the Golden Thread can be strengthened one deliberate action at a time. Close with a C.OM.PAs principle that feels most relevant to their situation.</p>
</div>

CRITICAL REQUIREMENTS:
- Use British English spelling throughout
- Reference RESPOND and C.OM.PAs throughout
- Make every recommendation actionable and specific to this school's context
- Focus on moving from "stated" to "lived"
- Map everything back to the Golden Thread
- Remember: inclusion is relational
- Aim for 2000-2500 words
- Use the HTML structure provided`;
}
