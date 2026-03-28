/**
 * Custom hook for skill-based teacher recommendations
 * Uses Lightcast API to match student department with teacher skills
 */

import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { lightcastService } from '../services/lightcastService';
import { TeacherProfile } from '../services/profileService';

interface UseRecommendedTeachersResult {
  recommendedTeachers: TeacherProfile[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecommendedTeachers(
  studentDepartment: string | undefined
): UseRecommendedTeachersResult {
  const [recommendedTeachers, setRecommendedTeachers] = useState<TeacherProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendedTeachers = async () => {
    console.log('=== LOADING RECOMMENDATIONS ===');
    console.log('Student Department:', studentDepartment || 'NONE - Will show all teachers');
    
    try {
      setIsLoading(true);
      setError(null);

      // Fetch ALL active teachers - no filters
      const { data: teachers, error: teachersError } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      console.log('Teachers fetched from database:', teachers?.length || 0);

      if (teachersError) {
        console.error('Teacher fetch error:', teachersError);
        throw teachersError;
      }

      if (!teachers || teachers.length === 0) {
        console.log('No teachers found in database');
        setRecommendedTeachers([]);
        setIsLoading(false);
        return;
      }

      // If student has a department, calculate match scores
      if (studentDepartment && studentDepartment.trim()) {
        console.log('Calculating match scores for department:', studentDepartment);
        
        // Get skills for department
        const skillsResult = await lightcastService.getSkillsForDepartment(studentDepartment);
        const departmentSkills = skillsResult.data || [];
        console.log('Department skills:', departmentSkills.slice(0, 5));

        // Calculate scores
        const teachersWithScores = teachers.map(teacher => {
          let matchScore = 0;
          const teacherSkills = teacher.expertise_tags || [];
          
          // Department matching (highest priority)
          if (teacher.department && studentDepartment) {
            const teacherDeptLower = teacher.department.toLowerCase().trim();
            const studentDeptLower = studentDepartment.toLowerCase().trim();
            
            if (teacherDeptLower === studentDeptLower) {
              matchScore += 30;
            } else if (teacherDeptLower.includes(studentDeptLower) || studentDeptLower.includes(teacherDeptLower)) {
              matchScore += 20;
            } else {
              const teacherWords = teacherDeptLower.split(/\s+/);
              const studentWords = studentDeptLower.split(/\s+/);
              const commonWords = teacherWords.filter(w => studentWords.includes(w) && w.length > 3);
              if (commonWords.length > 0) {
                matchScore += 15;
              }
            }
          }

          // Skill matching
          if (teacherSkills.length > 0 && departmentSkills.length > 0) {
            departmentSkills.forEach(deptSkill => {
              const deptSkillLower = deptSkill.toLowerCase().trim();
              teacherSkills.forEach((teacherSkill: string) => {
                const teacherSkillLower = teacherSkill.toLowerCase().trim();
                if (teacherSkillLower === deptSkillLower) {
                  matchScore += 10;
                } else if (teacherSkillLower.includes(deptSkillLower) || deptSkillLower.includes(teacherSkillLower)) {
                  matchScore += 5;
                }
              });
            });
          } else if (teacherSkills.length > 0) {
            matchScore += 5;
          }

          return { ...teacher, matchScore };
        });

        // Sort by score and take top 10
        const sorted = teachersWithScores
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 10);
        
        console.log('Top recommendations:', sorted.map(t => `${t.first_name} ${t.last_name} (score: ${t.matchScore})`));
        setRecommendedTeachers(sorted);
      } else {
        // NO DEPARTMENT - Just show first 5 teachers
        console.log('No department - showing first 5 teachers');
        setRecommendedTeachers(teachers.slice(0, 5));
      }
      
      console.log('=== RECOMMENDATIONS LOADED ===\n');
    } catch (err: any) {
      console.error('Error loading recommended teachers:', err);
      setError(err.message || 'Failed to load recommendations');
      
      // FALLBACK: Try to load ANY teachers
      try {
        const { data: fallbackTeachers } = await supabase
          .from('teacher_profiles')
          .select('*')
          .limit(5);
        
        if (fallbackTeachers && fallbackTeachers.length > 0) {
          console.log('Using fallback teachers:', fallbackTeachers.length);
          setRecommendedTeachers(fallbackTeachers);
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendedTeachers();
  }, [studentDepartment]);

  const refresh = async () => {
    await loadRecommendedTeachers();
  };

  return {
    recommendedTeachers,
    isLoading,
    error,
    refresh,
  };
}
