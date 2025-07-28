export const PROMPT_TEMPLATES = [
  {
    id: 'default',
    name: 'Default Analysis',
    description: 'Comprehensive UI/UX flow analysis',
    prompt: `Analyze these UI screenshots in sequence. For each screenshot, provide:
1. A brief, objective description of what's shown (UI elements, layout, content)
2. The apparent purpose or function of this screen
3. Any notable UI/UX patterns or components used

After analyzing individual screens, provide an overall flow analysis that describes:
- The user journey or workflow represented
- How the screens connect or relate to each other
- The overall purpose of this application or feature set

Be descriptive and objective, focusing on what is visible rather than making subjective judgments about quality.`
  },
  {
    id: 'accessibility',
    name: 'Accessibility Review',
    description: 'Focus on accessibility aspects',
    prompt: `Analyze these UI screenshots for accessibility considerations. For each screenshot, identify:
1. Text contrast and readability issues
2. Touch target sizes and spacing
3. Visual hierarchy and focus indicators
4. Potential screen reader challenges
5. Color-only information indicators

Provide recommendations for improving accessibility based on WCAG guidelines.`
  },
  {
    id: 'mobile-ux',
    name: 'Mobile UX Analysis',
    description: 'Mobile-specific UX evaluation',
    prompt: `Analyze these mobile app screenshots focusing on:
1. Touch-friendly interface elements
2. Thumb reachability for key actions
3. Information density and scrolling patterns
4. Mobile-specific interaction patterns (swipe, pinch, etc.)
5. Loading states and offline considerations

Evaluate the mobile user experience and suggest optimizations.`
  },
  {
    id: 'onboarding',
    name: 'Onboarding Flow',
    description: 'First-time user experience analysis',
    prompt: `Analyze this onboarding flow for new users. Evaluate:
1. Clarity of value proposition
2. Progressive disclosure of information
3. Friction points in the signup/setup process
4. Educational elements and tooltips
5. Time to first value

Assess how effectively the flow converts and engages new users.`
  },
  {
    id: 'conversion',
    name: 'Conversion Optimization',
    description: 'Focus on conversion rate optimization',
    prompt: `Analyze these screenshots for conversion optimization. Identify:
1. Clear calls-to-action and their prominence
2. Trust signals and social proof
3. Form design and field optimization
4. Error handling and validation
5. Checkout/purchase flow friction points

Suggest improvements to increase conversion rates.`
  },
  {
    id: 'design-system',
    name: 'Design System Audit',
    description: 'Consistency and component usage',
    prompt: `Audit these screenshots for design system compliance:
1. Consistent use of colors, typography, and spacing
2. Component variations and their appropriate usage
3. Icon consistency and meaning
4. Button styles and hierarchy
5. Form element consistency

Identify deviations from design system patterns and suggest improvements.`
  }
];

export const DEFAULT_PROMPT = PROMPT_TEMPLATES[0].prompt;