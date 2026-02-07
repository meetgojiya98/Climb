-- Seed global templates

-- Follow-up templates
INSERT INTO template_library (user_id, type, name, content) VALUES
(NULL, 'followup', 'After Application - Check In', '{
  "stage": "after_apply",
  "subject": "Following up on {title} application",
  "body": "Hi {hiring_manager},\n\nI wanted to follow up on my application for the {title} position at {company} that I submitted on {date}. I''m very excited about the opportunity to contribute to {company}''s mission.\n\nI believe my background in {key_skill} aligns well with the role''s requirements, and I''d welcome the chance to discuss how I can add value to your team.\n\nThank you for your consideration.\n\nBest regards"
}'),
(NULL, 'followup', 'Thank You After Interview', '{
  "stage": "thank_you",
  "subject": "Thank you - {title} interview",
  "body": "Hi {interviewer},\n\nThank you for taking the time to speak with me today about the {title} position. I enjoyed learning more about {company}''s approach to {topic_discussed}.\n\nOur conversation reinforced my enthusiasm for this role. I''m particularly excited about {specific_detail} and how my experience with {relevant_skill} can contribute to your goals.\n\nPlease let me know if there''s any additional information I can provide.\n\nLooking forward to the next steps.\n\nBest regards"
}'),
(NULL, 'followup', 'Post-Interview Follow-Up', '{
  "stage": "post_interview",
  "subject": "Checking in on {title} opportunity",
  "body": "Hi {hiring_manager},\n\nI wanted to reach out regarding the {title} position we discussed on {interview_date}. I remain very interested in joining {company} and contributing to {team_goal}.\n\nIs there any update on the hiring timeline or additional information I can provide to support the decision process?\n\nThank you again for the opportunity.\n\nBest regards"
}');

-- Bullet style templates
INSERT INTO template_library (user_id, type, name, content) VALUES
(NULL, 'bullet_style', 'XYZ Formula', '{
  "description": "Accomplished [X] as measured by [Y], by doing [Z]",
  "example": "Increased customer retention by 35% as measured by quarterly surveys, by implementing personalized onboarding flow"
}'),
(NULL, 'bullet_style', 'STAR Method', '{
  "description": "Situation, Task, Action, Result",
  "example": "When sales declined 20% (Situation), led initiative to revamp product messaging (Task), conducted customer research and A/B testing (Action), resulting in 45% increase in conversions (Result)"
}'),
(NULL, 'bullet_style', 'CAR Method', '{
  "description": "Challenge, Action, Result",
  "example": "Addressed 3-hour deployment process (Challenge), automated CI/CD pipeline using GitHub Actions (Action), reducing deployment time to 15 minutes and increasing release frequency by 300% (Result)"
}'),
(NULL, 'bullet_style', 'Impact-First', '{
  "description": "Lead with the result, then explain how",
  "example": "Drove $2M in annual revenue by launching enterprise tier with custom integrations for 15+ Fortune 500 clients"
}');

-- Tone presets
INSERT INTO template_library (user_id, type, name, content) VALUES
(NULL, 'tone', 'Professional', '{
  "description": "Balanced, clear, and competent",
  "guidelines": "Use industry-standard terminology. Be concise. Focus on results and impact. Maintain formal but approachable tone."
}'),
(NULL, 'tone', 'Warm', '{
  "description": "Personable and engaging",
  "guidelines": "Show enthusiasm for the mission. Use inclusive language. Emphasize collaboration and team fit. Maintain professionalism with personal touch."
}'),
(NULL, 'tone', 'Confident', '{
  "description": "Assertive and achievement-focused",
  "guidelines": "Lead with accomplishments. Use action verbs. Demonstrate leadership. Be direct about value proposition."
}'),
(NULL, 'tone', 'Technical', '{
  "description": "Precise and detail-oriented",
  "guidelines": "Include specific technologies and methodologies. Quantify technical achievements. Demonstrate depth of expertise. Use technical vocabulary appropriately."
}');
