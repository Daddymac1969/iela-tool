const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const assessmentData = JSON.parse(event.body);
    const { demographics, ratings } = assessmentData;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = buildPrompt(demographics, ratings);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }]
    });

    const analysis = message.content[0].text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate analysis',
        details: error.message 
      })
    };
  }
};

function buildPrompt(demographics, ratings) {
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

  return `You are an expert in school inclusion, equity, diversity, and safeguarding, specialising in the RESPOND framework and C.OM.PAs (Compassionate, Open-minded, Principled Actions) approach from TASIS England.

RESPOND FRAMEWORK - THE 7 STEPS:
The RESPOND framework is a trauma-informed, relational safeguarding approach developed at TASIS England that bridges the gap between policy and practice.

R – Recognise: Identify concerns, disclosures, or signs that a child may need support. Stay alert to changes in behaviour, presentation, or wellbeing.

E – Engage: Listen actively and build trust. Create a safe space for the child to share. The first 60 seconds of engagement shapes whether they'll disclose further. This is relational, not transactional.

S – Support: Provide immediate emotional and practical support. Validate their experience. Ensure they feel heard and believed. Address urgent safety needs.

P – Pause: Take time to think before acting. Avoid reactive decisions. Consider context, consult colleagues if appropriate, and plan your response thoughtfully.

O – Offer: Present options and next steps. Empower the child where possible. Explain what will happen next in age-appropriate language. Maintain agency whilst ensuring safety.

N – Notify: Follow safeguarding procedures. Report to DSL/appropriate authorities as required. Keep relevant people informed on a need-to-know basis. Follow up appropriately.

D – Document: Record accurately, factually, and contemporaneously. Use the child's words. Include what was seen, heard, and done. Store securely and follow data protection requirements.

KEY RESPOND PRINCIPLES:
- Trauma-informed: Recognises impact of adverse experiences
- Relational: Students experience safeguarding through relationships, not just processes
- Contextual: Considers the whole child and their circumstances
- Culturally sensitive without being culturally inactive: Balance understanding context with taking appropriate action
- Practice-focused: Bridges the gap between knowing policy and applying it in real situations

RESPOND is the "HOW" that sits between safeguarding policy (the "WHAT") and real-time practice.

C.OM.PAs FRAMEWORK:
Compassionate: Genuine empathy in every interaction. Understanding each person's context, culture, and lived experience before drawing conclusions. Check in when circumstances change. Listen first, don't defend. Discipline driven by understanding.

Open-minded: Actively challenging our own assumptions and biases. Creating spaces where difference is not tolerated but genuinely valued. Review curriculum for gaps. Question our systems. Make student voice genuine. Adapt when needed.

Principled Actions: Doing the right thing, even when it's difficult. Moving from values held privately to actions taken publicly. Values guide decisions. Challenge discrimination. Policies drive action. Visible in classrooms daily.

THE GOLDEN THREAD:
Values (C.OM.PAs) → Policy → Curriculum/Teaching → Culture (Adults) → Student Experience

Inclusion is only "lived" when it reaches the student experience level. Everything above must flow through to actual student experience, or it remains "stated" only.

---

Now analyse this school's inclusion self-assessment and provide detailed, actionable insights. Use British English spelling throughout (behaviour, recognise, analyse, organisation, centre, etc.).

SCHOOL CONTEXT:
- Role: ${roleLabels[demographics.yourRole] || 'Not specified'}
- Student count: ${studentCountLabels[demographics.studentCount] || 'Not specified'}
- Setting: ${schoolTypeLabels[demographics.schoolType] || 'Not specified'}
- Model: ${demographics.schoolModel?.join(', ') || 'Not specified'}
- Sector: ${demographics.schoolSector || 'Not specified'}
- Age ranges: ${demographics.ageRanges?.join(', ') || 'Not specified'}
- Qualifications: ${demographics.qualifications?.join(', ') || 'Not specified'}

ASSESSMENT SCORES (1=lowest, 5=highest):

**Mission & Values Level:**
1. Mission includes explicit inclusion commitments: ${ratings.mission_explicit}/5
2. Leadership models inclusive behaviour: ${ratings.leadership_models}/5

**Policy Level:**
3. Policies contain specific, actionable commitments: ${ratings.policy_specific}/5
4. Policies reviewed annually for inclusivity: ${ratings.policy_reviewed}/5
5. Policies are accessible to staff: ${ratings.policy_accessible}/5

**Curriculum & Teaching Level:**
6. Curriculum reflects diverse perspectives: ${ratings.curriculum_diverse}/5
7. Inclusion embedded across subjects: ${ratings.curriculum_embedded}/5
8. Teachers receive regular training: ${ratings.teacher_training}/5

**Culture & Relationships Level:**
9. Staff challenge bias/exclusionary language: ${ratings.staff_challenge}/5
10. Students from minoritised backgrounds feel valued: ${ratings.students_valued}/5
11. Families trust our response process: ${ratings.trust_response}/5

**Student Experience Level:**
12. Students can name trusted adults: ${ratings.student_trust}/5
13. School systematically collects student voice: ${ratings.student_voice}/5
14. Students say school genuinely values everyone: ${ratings.student_perception}/5

TASK:
Provide a comprehensive analysis structured with HTML formatting as follows. CRITICAL: Use British English spelling throughout (behaviour, recognise, organisation, centre, practise as verb/practice as noun, whilst, amongst, etc.):

<h2>🎯 Overall Assessment</h2>
<p>Brief summary of where this school is on the stated→lived inclusion journey. Map their scores against the Golden Thread (Values → Policy → Curriculum → Culture → Student Experience). Identify 2-3 key strengths to build on and the most critical gaps. Reference whether the gap is at Values, Policy, Teaching, Culture, or Student Experience level.</p>

<h2>🔍 Detailed Gap Analysis</h2>

<h3>Mission & Values Level</h3>
<p>What scores ${ratings.mission_explicit} and ${ratings.leadership_models} reveal about leadership commitment. Are C.OM.PAs principles visible at the top? Specific implications for this ${demographics.schoolType || 'school'} context. Why these scores matter for the whole Golden Thread flow.</p>

<h3>Policy Level</h3>
<p>What scores ${ratings.policy_specific}, ${ratings.policy_reviewed}, and ${ratings.policy_accessible} indicate about policy effectiveness. How this impacts daily practice in a school with ${demographics.studentCount || 'this size'}. Do policies enable staff to apply RESPOND principles, or just state compliance requirements?</p>

<h3>Curriculum & Teaching Level</h3>
<p>What scores ${ratings.curriculum_diverse}, ${ratings.curriculum_embedded}, and ${ratings.teacher_training} show about lived inclusion. Context-specific challenges for ${demographics.qualifications?.join(' and ') || 'this curriculum'}. Are staff equipped and confident to apply C.OM.PAs and RESPOND in real situations?</p>

<h3>Culture & Relationships Level</h3>
<p>What scores ${ratings.staff_challenge}, ${ratings.students_valued}, and ${ratings.trust_response} reveal about adult culture and student trust. This is where stated values either become lived practice or remain rhetoric.</p>

<h3>Student Experience Level (The Ultimate Measure)</h3>
<p>What scores ${ratings.student_trust}, ${ratings.student_voice}, and ${ratings.student_perception} reveal - this is where the Golden Thread either succeeds or breaks. Implications for ${demographics.ageRanges?.join(', ') || 'students'}. Can students name trusted adults (RESPOND's Engage principle)? Do they experience genuine inclusion or just stated values?</p>

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
<p>[Similar structure]</p>
</div>

<div class="action-plan">
<h3><span class="priority-badge priority-low">LOW PRIORITY</span> [Area Name]</h3>
<p>[Similar structure]</p>
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

[Repeat for Actions 2 and 3, each referencing RESPOND or C.OM.PAs]

<h2>💡 Context-Specific Insights</h2>
<div class="insight-box">
<h3>Tailored Recommendations</h3>
<p>Based on being a ${demographics.schoolType || 'school'} ${demographics.schoolModel?.join(' and ') || 'school'} with ${demographics.studentCount || 'students'} offering ${demographics.qualifications?.join(' and ') || 'qualifications'}:</p>
<ul>
<li>[Specific insight 1 - how their context affects Golden Thread flow]</li>
<li>[Specific insight 2 - RESPOND/C.OM.PAs application in their setting]</li>
<li>[Specific insight 3 - unique opportunities or challenges]</li>
<li>[If boarding school: emphasise RESPOND's Engage and student trust networks]</li>
<li>[If IB school: leverage TOK, CAS, ATL frameworks for inclusion]</li>
<li>[If small school: advantage of relational approach, challenge of resource constraints]</li>
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