/**
 * Development Mode Configuration
 * Set SKIP_AUTH to true to bypass authentication for testing
 */

export const DEV_CONFIG = {
  // Toggle this to skip authentication (FOR TESTING ONLY)
  // Set to false to test the full auth flow
  SKIP_AUTH: false,
  
  // Mock user data for testing
  MOCK_USER: {
    id: 'dev-student-001',
    email: 'student@test.com',
    role: 'student' as 'student' | 'teacher' | 'admin',
    first_name: 'Test',
    last_name: 'Student',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

// Change this to test different roles
// Options: 'student' | 'teacher' | 'admin'
export const setMockUserRole = (role: 'student' | 'teacher' | 'admin') => {
  DEV_CONFIG.MOCK_USER.role = role;
  if (role === 'teacher') {
    DEV_CONFIG.MOCK_USER.first_name = 'Test';
    DEV_CONFIG.MOCK_USER.last_name = 'Teacher';
    DEV_CONFIG.MOCK_USER.email = 'teacher@test.com';
  } else if (role === 'admin') {
    DEV_CONFIG.MOCK_USER.first_name = 'Test';
    DEV_CONFIG.MOCK_USER.last_name = 'Admin';
    DEV_CONFIG.MOCK_USER.email = 'admin@test.com';
  }
};
