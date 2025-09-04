
import { Injectable, signal, inject } from '@angular/core';
import { supabaseClient } from '../supabase.client';
import { AppUser } from './auth.service';

export interface Lesson {
  title: string;
  duration: string;
  videoUrl: string;
  isFree: boolean;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  instructorName: string;
  instructorImage: string;
  duration: string;
  courseImage: string;
  level: string;
  lessonsCount: number;
  rating: number;
  reviewsCount: number;
  description: string;
  whatYouWillLearn: string[];
  videoUrl?: string;
  hasCertificate: boolean;
  lessons: Lesson[];
  instructorId: string;
  status: 'draft' | 'published' | 'archived';
  instructor?: AppUser; // To hold joined profile data
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  allCourses = signal<Course[]>([]);

  constructor() {
    this.fetchCourses();
  }

  async fetchCourses() {
    try {
      // Step 1: Fetch all courses
      const { data: coursesData, error: coursesError } = await supabaseClient
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        throw coursesError;
      }

      if (!coursesData) {
        this.allCourses.set([]);
        return;
      }

      // Step 2: Get unique instructor IDs
      const instructorIds = [...new Set(coursesData.map(c => c.instructor_id).filter(id => id))];

      if (instructorIds.length === 0) {
        this.processAndSetCourses(coursesData, new Map());
        return;
      }

      // Step 3: Fetch all corresponding profiles
      const { data: profilesData, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('*')
        .in('id', instructorIds);
      
      if (profilesError) {
        console.error('Error fetching instructor profiles:', profilesError);
        this.processAndSetCourses(coursesData, new Map());
        return;
      }

      // Step 4: Create a map for easy lookup
      const instructorMap = new Map<string, AppUser>();
      profilesData.forEach(profile => {
        instructorMap.set(profile.id, {
          uid: profile.id,
          displayName: profile.full_name,
          photoURL: profile.avatar_url,
          role: profile.role,
          title: profile.title,
          bio: profile.bio,
          linkedinUrl: profile.linkedin_url,
          isAdmin: profile.role === 'admin',
          email: undefined,
        });
      });
      
      // Step 5: Map profiles to courses and set the signal
      this.processAndSetCourses(coursesData, instructorMap);

    } catch (error) {
      console.error('Error in fetchCourses:', error);
      this.allCourses.set([]);
    }
  }

  private processAndSetCourses(dbCourses: any[], instructorMap: Map<string, AppUser>) {
    const processedData = dbCourses.map((dbCourse: any) => {
        const whatYouWillLearn = Array.isArray(dbCourse.what_you_will_learn)
          ? dbCourse.what_you_will_learn
          : (typeof dbCourse.what_you_will_learn === 'string'
            ? dbCourse.what_you_will_learn.split('\n').filter((line: string) => line.trim() !== '')
            : []);
        
        const instructor = instructorMap.get(dbCourse.instructor_id);

        return {
          id: dbCourse.id,
          title: dbCourse.title,
          category: dbCourse.category,
          instructorName: instructor?.displayName || dbCourse.instructor_name,
          instructorImage: instructor?.photoURL || dbCourse.instructor_image,
          duration: dbCourse.duration,
          courseImage: dbCourse.course_image,
          level: dbCourse.level,
          lessonsCount: dbCourse.lessons_count,
          rating: dbCourse.rating,
          reviewsCount: dbCourse.reviews_count,
          description: dbCourse.description,
          whatYouWillLearn: whatYouWillLearn,
          videoUrl: dbCourse.video_url,
          hasCertificate: dbCourse.has_certificate ?? false,
          lessons: dbCourse.lessons ?? [],
          instructorId: dbCourse.instructor_id,
          status: dbCourse.status ?? 'published',
          instructor: instructor,
        } as Course;
      });
    this.allCourses.set(processedData);
  }

  async addCourse(courseData: Omit<Course, 'id' | 'rating' | 'reviewsCount'>): Promise<void> {
    const newCourseForDb = {
      title: courseData.title,
      category: courseData.category,
      instructor_name: courseData.instructorName,
      instructor_image: courseData.instructorImage,
      duration: courseData.duration,
      course_image: courseData.courseImage,
      level: courseData.level,
      lessons_count: courseData.lessonsCount,
      description: courseData.description,
      what_you_will_learn: courseData.whatYouWillLearn,
      video_url: courseData.videoUrl ?? null,
      has_certificate: courseData.hasCertificate,
      rating: 0,
      reviews_count: 0,
      lessons: courseData.lessons,
      instructor_id: courseData.instructorId,
      status: courseData.status,
    };

    const { error } = await supabaseClient.from('courses').insert([newCourseForDb]);
    if (error) {
      console.error('Error adding course:', error.message);
      throw new Error(`Failed to add course: ${error.message}`);
    }
    await this.fetchCourses();
  }

  async updateCourse(courseId: string, updates: Partial<Omit<Course, 'id'>>): Promise<void> {
    const dbUpdates: { [key: string]: any } = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.duration) dbUpdates.duration = updates.duration;
    if (updates.level) dbUpdates.level = updates.level;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.whatYouWillLearn) dbUpdates.what_you_will_learn = updates.whatYouWillLearn;
    if (updates.hasCertificate !== undefined) dbUpdates.has_certificate = updates.hasCertificate;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.courseImage) dbUpdates.course_image = updates.courseImage;
    if (updates.videoUrl) dbUpdates.video_url = updates.videoUrl;
    if (updates.lessons) dbUpdates.lessons = updates.lessons;
    if (updates.lessonsCount) dbUpdates.lessons_count = updates.lessonsCount;

    const { error } = await supabaseClient
      .from('courses')
      .update(dbUpdates)
      .eq('id', courseId);
    
    if (error) {
      throw new Error(`Failed to update course: ${error.message}`);
    }
    await this.fetchCourses();
  }
  
  async deleteCourse(courseId: string): Promise<void> {
    const { error } = await supabaseClient
      .from('courses')
      .delete()
      .eq('id', courseId);
    if (error) {
      throw new Error(`Failed to delete course: ${error.message}`);
    }
    await this.fetchCourses();
  }

  async uploadFile(file: File, bucket: string): Promise<string> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'file';
    const originalNameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    const sanitizedBaseName = originalNameWithoutExtension
      .replace(/[^a-zA-Z0-9_ -]/g, '')
      .trim()
      .replace(/\s+/g, '_');
      
    const finalBaseName = sanitizedBaseName || 'upload';

    const fileName = `${Date.now()}_${finalBaseName}.${fileExtension}`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (uploadError) {
      console.error(`Error uploading to ${bucket}:`, uploadError.message);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    const { data } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(fileName);
      
    if (!data.publicUrl) {
        throw new Error('Could not get public URL for uploaded file.');
    }
    
    return data.publicUrl;
  }
}