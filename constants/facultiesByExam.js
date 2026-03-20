/** Faculty names and image URLs by exam. Keys: neet, jee, sat, ap */
export const FACULTIES_BY_EXAM = {
  neet: [
    { name: "Dr. Navya Gaur", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-neet-testimonial/Screen%20Shot%202017-03-23%20at%2011.31.42%20PM.png" },
    { name: "Dr. Ritu Madan", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-neet-testimonial/Screen%20Shot%202017-03-23%20at%2011.50.33%20PM.png" },
    { name: "Dr. Nivedeta Sion", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-neet-testimonial/Screen%20Shot%202017-03-24%20at%2012.03.55%20AM.png" },
    { name: "Testprepkart", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-neet-testimonial/Logo%20Fevicon.jpg" },
  ],
  jee: [
    { name: "Megha Rastogi", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-jee-testimonial/Megha-TestprepKart.png" },
    { name: "Arpit Nagar", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-jee-testimonial/Arpit-Nagar.png" },
    { name: "Ashwin Rajput", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-jee-testimonial/Ashwin-Rajput-TestprepKart.png" },
  ],
  sat: [
    { name: "NEHA SHARMA", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-sat-testimonial/Neha%20Sharma.png" },
    { name: "VISHAWANATH SHANKARAN", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-sat-testimonial/Vishwanathan-SAT.png" },
    { name: "PRASHANT PANDEY", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-sat-testimonial/faculty-1.png" },
    { name: "PRATEEK RANA", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-sat-testimonial/Faculty-1%20(1).png" },
  ],
  ap: [
    { name: "Mr. D. Bakshi", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/faculty-1.png" },
    { name: "Mr. P. Verma", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/AP_Faculty_1_TestprepKart.jpg" },
    { name: "Mr. Vasu S.", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/AP_Faculty_2_TestprepKart.jpg" },
    { name: "Mrs. A. Garg", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/AP_Faculty_3_TestprepKart.jpg" },
    { name: "Dr. V. Krishnamurthy", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/AP_Faculty_4_TestprepKart.jpg" },
  ],
};

export function getFacultiesForExam(examSlugOrName) {
  if (!examSlugOrName || typeof examSlugOrName !== "string") return [];
  const key = examSlugOrName.trim().toLowerCase();
  if (FACULTIES_BY_EXAM[key]) return FACULTIES_BY_EXAM[key];
  const firstWord = key.split(/\s+/)[0];
  return FACULTIES_BY_EXAM[firstWord] || [];
}
