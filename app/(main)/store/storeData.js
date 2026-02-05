
export const STORE_CATEGORIES = [
    { id: "all", name: "All Products" },
    { id: "course", name: "Online Courses" },
    { id: "ebook", name: "eBooks & Notes" },
    { id: "paper", name: "Practice Papers" },
];

export const STORE_PRODUCTS = [
    {
        id: "course-neet-physics",
        name: "NEET Physics Masterclass",
        category: "course",
        subject: "Physics",
        price: 4999,
        originalPrice: 9999,
        rating: 4.8,
        reviews: 1240,
        image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800",
        description: "Master NEET Physics with our comprehensive video lectures, practice questions, and expert tips. Covers all 11th and 12th topics in depth.",
        features: [
            "200+ Video Lectures",
            "Chapter-wise Study Notes",
            "5000+ Practice MCQs",
            "Live Doubt Solving Sessions",
            "Personalized Performance Report"
        ],
        badge: "Best Seller"
    },
    {
        id: "ebook-chem-notes",
        name: "Inorganic Chemistry Formula Book",
        category: "ebook",
        subject: "Chemistry",
        price: 299,
        originalPrice: 599,
        rating: 4.9,
        reviews: 850,
        image: "https://images.unsplash.com/photo-1532187875605-18342379bc37?auto=format&fit=crop&q=80&w=800",
        description: "All chemical formulas and reactions at your fingertips. Perfect for last-minute revision and quick reference.",
        features: [
            "Topic-wise Formula Charts",
            "Important Reactions & Mechanisms",
            "Printable High-Quality PDF",
            "Weekly Updates",
            "Compatible with Mobile/Web"
        ],
        badge: "Trending"
    },
    {
        id: "paper-full-test-series",
        name: "Target NEET 2024 Full Test Series",
        category: "paper",
        subject: "Full Syllabus",
        price: 1499,
        originalPrice: 2999,
        rating: 4.7,
        reviews: 2100,
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800",
        description: "Boost your confidence with 20 full-length NEET mock tests designed by experts to mirror the actual exam environment.",
        features: [
            "20 Full-Length Mock Tests",
            "Detailed Video Solutions",
            "All India Ranking System",
            "Error Analysis & Time Tracking",
            "Available in English & Hindi"
        ],
        badge: "Highly Rated"
    },
    {
        id: "course-bio-botany",
        name: "Botany Concept Builder",
        category: "course",
        subject: "Biology",
        price: 2499,
        originalPrice: 4499,
        rating: 4.6,
        reviews: 780,
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb773b09?auto=format&fit=crop&q=80&w=800",
        description: "Deep dive into Botany concepts. Learn plant physiology, genetics, and ecology through simplified 3D animations.",
        features: [
            "3D Animated Concept Videos",
            "Interactive Quizzes",
            "Detailed Botany Diagrams",
            "Previous Year Question Solving",
            "Mentor Support"
        ]
    },
    {
        id: "ebook-math-formulas",
        name: "JEE Mathematics Shortcut Tricks",
        category: "ebook",
        subject: "Maths",
        price: 399,
        originalPrice: 799,
        rating: 4.8,
        reviews: 560,
        image: "https://images.unsplash.com/photo-1509228468518-180dd48219d7?auto=format&fit=crop&q=80&w=800",
        description: "Revolutionize your problem-solving speed with 100+ proven shortcut tricks for JEE Mathematics.",
        features: [
            "100+ Shortcut Math Tricks",
            "Solved Examples for Each Trick",
            "Pocket PDF Format",
            "Dark Mode Optimized",
            "Lifetime Access"
        ]
    },
    {
        id: "paper-sat-papers",
        name: "SAT Prep Ultimate Practice Set",
        category: "paper",
        subject: "SAT",
        price: 1999,
        originalPrice: 3499,
        rating: 4.5,
        reviews: 320,
        image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800",
        description: "Comprehensive SAT practice set covering both Reading/Writing and Math sections with digital SAT pattern.",
        features: [
            "10 Digital SAT Mock Tests",
            "Adaptive Difficulty Simulation",
            "Instant Score Report",
            "Grammar & Vocabulary Builder",
            "Math Concept Summaries"
        ]
    }
];
