export interface SubjectData {
  subject: string;
  completed: number;
  expected: number;
}

export interface SectionData {
  sectionName: string;
  subjects: SubjectData[];
}

export interface GradeData {
  gradeName: string;
  sections: SectionData[];
}

export interface SchoolData {
  schoolName: string;
  grades: GradeData[];
}

export const mockSchoolsData: SchoolData[] = [
  {
    schoolName: "Katalystz Academy",
    grades: [
      {
        gradeName: "Grade 9",
        sections: [
          {
            sectionName: "A",
            subjects: [
              { subject: "Mathematics", completed: 65, expected: 70 },
              { subject: "Science", completed: 80, expected: 85 },
              { subject: "English", completed: 90, expected: 90 },
            ]
          },
          {
            sectionName: "B",
            subjects: [
              { subject: "Mathematics", completed: 60, expected: 70 },
              { subject: "Science", completed: 75, expected: 85 },
              { subject: "English", completed: 85, expected: 90 },
            ]
          }
        ]
      },
      {
        gradeName: "Grade 10",
        sections: [
          {
            sectionName: "A",
            subjects: [
              { subject: "Mathematics", completed: 85, expected: 90 },
              { subject: "Science", completed: 78, expected: 90 },
              { subject: "English", completed: 92, expected: 95 },
            ]
          },
          {
            sectionName: "B",
            subjects: [
              { subject: "Mathematics", completed: 80, expected: 90 },
              { subject: "Science", completed: 75, expected: 90 },
              { subject: "English", completed: 90, expected: 95 },
            ]
          }
        ]
      }
    ],
  },
  {
    schoolName: "Future Ready High",
    grades: [
      {
        gradeName: "Grade 9",
        sections: [
          {
            sectionName: "A",
            subjects: [
              { subject: "Mathematics", completed: 40, expected: 60 },
              { subject: "Science", completed: 55, expected: 65 },
            ]
          }
        ]
      }
    ]
  }
];
