/**
 * Lightcast Open Skills API Service
 * Handles OAuth2 authentication and skill matching
 */

import { ApiResponse } from '../types';

// Lightcast API Configuration
const LIGHTCAST_CLIENT_ID = process.env.EXPO_PUBLIC_LIGHTCAST_CLIENT_ID || '';
const LIGHTCAST_CLIENT_SECRET = process.env.EXPO_PUBLIC_LIGHTCAST_CLIENT_SECRET || '';
const LIGHTCAST_AUTH_URL = 'https://auth.emsicloud.com/connect/token';
const LIGHTCAST_SKILLS_URL = 'https://emsiservices.com/skills/versions/latest/skills';

interface LightcastToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  expires_at: number;
}

interface LightcastSkill {
  id: string;
  name: string;
  type: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

class LightcastService {
  private token: LightcastToken | null = null;

  /**
   * Get OAuth2 access token using client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.token && Date.now() < this.token.expires_at) {
      return this.token.access_token;
    }

    try {
      const response = await fetch(LIGHTCAST_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: LIGHTCAST_CLIENT_ID,
          client_secret: LIGHTCAST_CLIENT_SECRET,
          grant_type: 'client_credentials',
          scope: 'emsi_open',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache token with expiration time
      this.token = {
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        expires_at: Date.now() + (data.expires_in * 1000) - 60000, // Subtract 1 minute for safety
      };

      return this.token.access_token;
    } catch (error) {
      console.error('Lightcast authentication error:', error);
      throw error;
    }
  }

  /**
   * Search for skills by query
   */
  async searchSkills(query: string, limit: number = 20): Promise<ApiResponse<LightcastSkill[]>> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${LIGHTCAST_SKILLS_URL}?q=${encodeURIComponent(query)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Skills search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { data: data.data || [] };
    } catch (error: any) {
      console.error('Error searching skills:', error);
      return { error: error.message || 'Failed to search skills' };
    }
  }

  /**
   * Get skills by IDs
   */
  async getSkillsByIds(skillIds: string[]): Promise<ApiResponse<LightcastSkill[]>> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(LIGHTCAST_SKILLS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: skillIds }),
      });

      if (!response.ok) {
        throw new Error(`Get skills failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { data: data.data || [] };
    } catch (error: any) {
      console.error('Error getting skills:', error);
      return { error: error.message || 'Failed to get skills' };
    }
  }

  /**
   * Get related skills for a given skill
   */
  async getRelatedSkills(skillId: string, limit: number = 10): Promise<ApiResponse<LightcastSkill[]>> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${LIGHTCAST_SKILLS_URL}/${skillId}/related?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Get related skills failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { data: data.data || [] };
    } catch (error: any) {
      console.error('Error getting related skills:', error);
      return { error: error.message || 'Failed to get related skills' };
    }
  }

  /**
   * Map department to relevant skill keywords
   * This provides a fallback when Lightcast API is unavailable
   * Comprehensive mapping for all major college departments
   */
  getDepartmentSkillKeywords(department: string): string[] {
    const departmentMap: Record<string, string[]> = {
      // Computer Science & IT
      'Computer Science': [
        'Programming', 'Software Development', 'Web Development', 'Mobile Development',
        'Database Management', 'Data Structures', 'Algorithms', 'Computer Science',
        'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'SQL', 'Git',
        'Software Engineering', 'System Design', 'API Development', 'Cloud Computing',
        'Machine Learning', 'Artificial Intelligence', 'Cybersecurity', 'DevOps',
        'Full Stack Development', 'Frontend Development', 'Backend Development'
      ],
      'Information Technology': [
        'IT Support', 'Network Administration', 'System Administration', 'Cybersecurity',
        'Cloud Computing', 'Database Management', 'Technical Support', 'IT Infrastructure',
        'Network Security', 'Server Management', 'Troubleshooting', 'Help Desk',
        'Windows Server', 'Linux', 'Virtualization', 'IT Project Management'
      ],
      'Computer Studies': [
        'Programming', 'Software Development', 'Web Development', 'Mobile Development',
        'Database Management', 'Data Structures', 'Algorithms', 'Computer Science',
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'Git',
        'Software Engineering', 'System Design', 'API Development', 'Cloud Computing'
      ],
      
      // Engineering Disciplines
      'Engineering': [
        'Engineering', 'Mathematics', 'Physics', 'CAD', 'AutoCAD', 'SolidWorks',
        'Project Management', 'Technical Drawing', 'Problem Solving', 'Circuit Design',
        'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering',
        'Engineering Design', 'Technical Analysis', 'Quality Control'
      ],
      'Mechanical Engineering': [
        'Mechanical Design', 'CAD', 'SolidWorks', 'AutoCAD', 'Thermodynamics',
        'Fluid Mechanics', 'Manufacturing', 'Materials Science', 'Machine Design',
        'HVAC', 'Robotics', 'Automation', 'Product Design', 'FEA Analysis'
      ],
      'Electrical Engineering': [
        'Circuit Design', 'Electronics', 'Power Systems', 'Control Systems',
        'Signal Processing', 'Microcontrollers', 'PCB Design', 'Embedded Systems',
        'Telecommunications', 'Renewable Energy', 'Instrumentation', 'MATLAB'
      ],
      'Civil Engineering': [
        'Structural Engineering', 'Construction Management', 'AutoCAD', 'Surveying',
        'Geotechnical Engineering', 'Transportation Engineering', 'Hydraulics',
        'Building Design', 'Project Planning', 'Cost Estimation', 'Site Management'
      ],
      'Chemical Engineering': [
        'Process Engineering', 'Chemical Processes', 'Thermodynamics', 'Reaction Engineering',
        'Process Control', 'Plant Design', 'Safety Engineering', 'Quality Control',
        'Materials Science', 'Environmental Engineering', 'Process Simulation'
      ],
      'Industrial Engineering': [
        'Operations Research', 'Supply Chain Management', 'Quality Management',
        'Process Optimization', 'Lean Manufacturing', 'Six Sigma', 'Production Planning',
        'Ergonomics', 'Facility Layout', 'Inventory Management', 'Project Management'
      ],
      
      // Business & Management
      'Business': [
        'Business Administration', 'Management', 'Marketing', 'Finance', 'Accounting',
        'Economics', 'Entrepreneurship', 'Business Strategy', 'Leadership',
        'Project Management', 'Data Analysis', 'Excel', 'Business Communication',
        'Sales', 'Customer Service', 'Business Development', 'Strategic Planning'
      ],
      'Business Administration': [
        'Management', 'Leadership', 'Strategic Planning', 'Business Strategy',
        'Operations Management', 'Human Resources', 'Organizational Behavior',
        'Business Communication', 'Decision Making', 'Team Management', 'Business Ethics'
      ],
      'Accounting': [
        'Financial Accounting', 'Managerial Accounting', 'Auditing', 'Taxation',
        'Cost Accounting', 'Financial Reporting', 'QuickBooks', 'Excel', 'GAAP',
        'Financial Analysis', 'Bookkeeping', 'Budget Management', 'Payroll'
      ],
      'Finance': [
        'Financial Analysis', 'Investment Management', 'Corporate Finance',
        'Financial Planning', 'Risk Management', 'Portfolio Management',
        'Financial Modeling', 'Excel', 'Banking', 'Capital Markets', 'Valuation'
      ],
      'Marketing': [
        'Digital Marketing', 'Social Media Marketing', 'Content Marketing', 'SEO',
        'Brand Management', 'Market Research', 'Advertising', 'Consumer Behavior',
        'Marketing Strategy', 'Email Marketing', 'Analytics', 'Campaign Management'
      ],
      'Management': [
        'Leadership', 'Team Management', 'Project Management', 'Strategic Planning',
        'Operations Management', 'Change Management', 'Performance Management',
        'Conflict Resolution', 'Decision Making', 'Business Strategy'
      ],
      'Entrepreneurship': [
        'Business Planning', 'Startup Management', 'Innovation', 'Business Development',
        'Venture Capital', 'Market Analysis', 'Product Development', 'Pitching',
        'Financial Planning', 'Risk Management', 'Networking', 'Sales'
      ],
      'Economics': [
        'Microeconomics', 'Macroeconomics', 'Econometrics', 'Economic Analysis',
        'Statistical Analysis', 'Data Analysis', 'Economic Policy', 'Research',
        'Financial Economics', 'International Economics', 'Economic Modeling'
      ],
      
      // Arts & Humanities
      'Arts and Sciences': [
        'Research', 'Writing', 'Critical Thinking', 'Communication', 'Analysis',
        'Literature', 'History', 'Psychology', 'Sociology', 'Philosophy',
        'Scientific Method', 'Data Collection', 'Academic Writing', 'Public Speaking'
      ],
      'English': [
        'Writing', 'Literature', 'Grammar', 'Creative Writing', 'Academic Writing',
        'Literary Analysis', 'Composition', 'Editing', 'Proofreading', 'Research',
        'Communication', 'Public Speaking', 'Technical Writing', 'Rhetoric'
      ],
      'Psychology': [
        'Counseling', 'Mental Health', 'Behavioral Analysis', 'Research Methods',
        'Statistics', 'Clinical Psychology', 'Developmental Psychology',
        'Cognitive Psychology', 'Social Psychology', 'Therapy', 'Assessment'
      ],
      'Sociology': [
        'Social Research', 'Data Analysis', 'Survey Design', 'Social Theory',
        'Qualitative Research', 'Quantitative Research', 'Community Development',
        'Social Policy', 'Cultural Analysis', 'Statistics', 'Ethnography'
      ],
      'History': [
        'Historical Research', 'Archival Research', 'Writing', 'Analysis',
        'Critical Thinking', 'Documentation', 'Historiography', 'Primary Sources',
        'Academic Writing', 'Presentation', 'Cultural Studies'
      ],
      'Philosophy': [
        'Critical Thinking', 'Logic', 'Ethics', 'Argumentation', 'Analysis',
        'Writing', 'Research', 'Philosophical Theory', 'Debate', 'Reasoning'
      ],
      'Communication': [
        'Public Speaking', 'Writing', 'Media Production', 'Journalism',
        'Public Relations', 'Social Media', 'Broadcasting', 'Interpersonal Communication',
        'Presentation Skills', 'Content Creation', 'Digital Media', 'Editing'
      ],
      
      // Education
      'Education': [
        'Teaching', 'Pedagogy', 'Curriculum Development', 'Classroom Management',
        'Educational Psychology', 'Assessment', 'Lesson Planning', 'Student Engagement',
        'Educational Technology', 'Learning Theories', 'Child Development',
        'Instructional Design', 'Special Education', 'Differentiated Instruction'
      ],
      'Elementary Education': [
        'Child Development', 'Classroom Management', 'Lesson Planning', 'Literacy',
        'Mathematics Education', 'Early Childhood Education', 'Student Assessment',
        'Parent Communication', 'Behavior Management', 'Curriculum Planning'
      ],
      'Secondary Education': [
        'Subject Matter Expertise', 'Adolescent Development', 'Classroom Management',
        'Curriculum Development', 'Assessment', 'Instructional Strategies',
        'Educational Technology', 'Student Engagement', 'Differentiated Instruction'
      ],
      'Special Education': [
        'IEP Development', 'Behavior Management', 'Adaptive Teaching', 'Assessment',
        'Inclusive Education', 'Learning Disabilities', 'Assistive Technology',
        'Differentiated Instruction', 'Parent Collaboration', 'Case Management'
      ],
      
      // Health Sciences
      'Nursing': [
        'Patient Care', 'Medical Terminology', 'Anatomy', 'Physiology', 'Pharmacology',
        'Clinical Skills', 'Health Assessment', 'Nursing Practice', 'Healthcare',
        'Medical Ethics', 'Emergency Care', 'Patient Safety', 'IV Therapy',
        'Wound Care', 'Vital Signs', 'Documentation', 'Critical Care'
      ],
      'Medicine': [
        'Clinical Medicine', 'Diagnosis', 'Patient Care', 'Medical Ethics',
        'Anatomy', 'Physiology', 'Pharmacology', 'Surgery', 'Emergency Medicine',
        'Internal Medicine', 'Medical Research', 'Patient Communication'
      ],
      'Pharmacy': [
        'Pharmacology', 'Drug Interactions', 'Pharmaceutical Care', 'Medication Management',
        'Clinical Pharmacy', 'Compounding', 'Patient Counseling', 'Drug Information',
        'Pharmacy Law', 'Therapeutics', 'Pharmaceutical Calculations'
      ],
      'Physical Therapy': [
        'Rehabilitation', 'Exercise Therapy', 'Manual Therapy', 'Patient Assessment',
        'Therapeutic Exercise', 'Biomechanics', 'Orthopedics', 'Sports Medicine',
        'Pain Management', 'Mobility Training', 'Patient Education'
      ],
      'Public Health': [
        'Epidemiology', 'Health Policy', 'Community Health', 'Health Education',
        'Disease Prevention', 'Health Promotion', 'Biostatistics', 'Environmental Health',
        'Global Health', 'Health Systems', 'Program Planning'
      ],
      
      // Sciences
      'Biology': [
        'Cell Biology', 'Genetics', 'Molecular Biology', 'Ecology', 'Evolution',
        'Laboratory Techniques', 'Research Methods', 'Microbiology', 'Biochemistry',
        'Scientific Writing', 'Data Analysis', 'Microscopy', 'Biotechnology'
      ],
      'Chemistry': [
        'Organic Chemistry', 'Inorganic Chemistry', 'Analytical Chemistry',
        'Physical Chemistry', 'Laboratory Techniques', 'Spectroscopy',
        'Chemical Analysis', 'Research Methods', 'Safety Protocols', 'Instrumentation'
      ],
      'Physics': [
        'Classical Mechanics', 'Electromagnetism', 'Quantum Mechanics', 'Thermodynamics',
        'Optics', 'Laboratory Techniques', 'Mathematical Physics', 'Research Methods',
        'Data Analysis', 'Computational Physics', 'Experimental Design'
      ],
      'Mathematics': [
        'Calculus', 'Linear Algebra', 'Statistics', 'Differential Equations',
        'Mathematical Modeling', 'Problem Solving', 'Abstract Algebra', 'Analysis',
        'Discrete Mathematics', 'Probability', 'Mathematical Proof', 'MATLAB'
      ],
      
      // Social Sciences
      'Political Science': [
        'Political Theory', 'Public Policy', 'International Relations', 'Research Methods',
        'Political Analysis', 'Government', 'Public Administration', 'Policy Analysis',
        'Comparative Politics', 'Political Economy', 'Writing', 'Critical Thinking'
      ],
      'Anthropology': [
        'Cultural Anthropology', 'Ethnography', 'Qualitative Research', 'Fieldwork',
        'Cultural Analysis', 'Archaeological Methods', 'Research Methods',
        'Cross-Cultural Communication', 'Data Collection', 'Writing'
      ],
      
      // Architecture & Design
      'Architecture': [
        'Architectural Design', 'CAD', 'AutoCAD', 'Revit', 'SketchUp', '3D Modeling',
        'Building Design', 'Construction Documents', 'Site Planning', 'Sustainable Design',
        'Building Codes', 'Structural Systems', 'Architectural History', 'Rendering'
      ],
      'Interior Design': [
        'Space Planning', 'Color Theory', 'Furniture Design', 'CAD', 'SketchUp',
        '3D Visualization', 'Materials Selection', 'Lighting Design', 'Client Relations',
        'Project Management', 'Building Codes', 'Sustainable Design'
      ],
      'Graphic Design': [
        'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Typography',
        'Layout Design', 'Branding', 'Logo Design', 'Digital Design', 'Print Design',
        'UI/UX Design', 'Color Theory', 'Visual Communication', 'Creative Thinking'
      ],
      
      // Law & Criminal Justice
      'Law': [
        'Legal Research', 'Legal Writing', 'Case Analysis', 'Contract Law',
        'Constitutional Law', 'Criminal Law', 'Civil Procedure', 'Legal Ethics',
        'Litigation', 'Negotiation', 'Legal Reasoning', 'Advocacy'
      ],
      'Criminal Justice': [
        'Criminology', 'Law Enforcement', 'Criminal Law', 'Corrections',
        'Forensic Science', 'Investigation', 'Criminal Procedure', 'Ethics',
        'Security Management', 'Crime Analysis', 'Report Writing'
      ],
      
      // Hospitality & Tourism
      'Hospitality Management': [
        'Hotel Management', 'Customer Service', 'Food Service Management',
        'Event Planning', 'Tourism Management', 'Operations Management',
        'Guest Relations', 'Revenue Management', 'Quality Control', 'Leadership'
      ],
      'Tourism': [
        'Tourism Management', 'Travel Planning', 'Destination Marketing',
        'Customer Service', 'Event Management', 'Cultural Awareness',
        'Tour Operations', 'Hospitality', 'Business Development'
      ],
      
      // Agriculture
      'Agriculture': [
        'Crop Science', 'Soil Science', 'Agricultural Economics', 'Farm Management',
        'Sustainable Agriculture', 'Plant Pathology', 'Agricultural Technology',
        'Livestock Management', 'Agribusiness', 'Food Production', 'Research Methods'
      ],
      
      // Environmental Science
      'Environmental Science': [
        'Ecology', 'Environmental Policy', 'Conservation', 'Sustainability',
        'Environmental Assessment', 'Climate Science', 'GIS', 'Field Research',
        'Data Analysis', 'Environmental Law', 'Resource Management', 'Pollution Control'
      ],
    };

    // Normalize department name for matching
    const normalizedDept = department.toLowerCase().trim();
    
    // First try exact match (case-insensitive)
    for (const [key, skills] of Object.entries(departmentMap)) {
      if (normalizedDept === key.toLowerCase()) {
        return skills;
      }
    }
    
    // Then try partial match
    for (const [key, skills] of Object.entries(departmentMap)) {
      if (normalizedDept.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedDept)) {
        return skills;
      }
    }

    // Default fallback skills for any department
    return [
      'Research', 'Communication', 'Problem Solving', 'Critical Thinking',
      'Writing', 'Analysis', 'Project Management', 'Teamwork', 'Leadership',
      'Time Management', 'Presentation Skills', 'Data Analysis'
    ];
  }

  /**
   * Get skill cluster for a department using Lightcast API
   * Falls back to local mapping if API fails
   */
  async getSkillsForDepartment(department: string): Promise<ApiResponse<string[]>> {
    try {
      // Try to get skills from Lightcast API
      const searchResult = await this.searchSkills(department, 15);
      
      if (searchResult.data && searchResult.data.length > 0) {
        // Extract skill names from Lightcast response
        const skillNames = searchResult.data.map(skill => skill.name);
        
        // Combine with local keywords for better coverage
        const localKeywords = this.getDepartmentSkillKeywords(department);
        const combinedSkills = [...new Set([...skillNames, ...localKeywords])];
        
        return { data: combinedSkills };
      }

      // Fallback to local mapping
      const localSkills = this.getDepartmentSkillKeywords(department);
      return { data: localSkills };
    } catch (error: any) {
      console.warn('Lightcast API unavailable, using local mapping:', error.message);
      
      // Fallback to local mapping
      const localSkills = this.getDepartmentSkillKeywords(department);
      return { data: localSkills };
    }
  }
}

export const lightcastService = new LightcastService();
