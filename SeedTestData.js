const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User"); // Adjust the path as needed
const Worker = require("./models/Worker"); // Adjust the path as needed
const Service = require("./models/Service"); // Adjust the path as needed
const Review = require("./models/Review"); // Adjust the path as needed
const Revenue = require("./models/Revenue"); // Adjust the path as needed
const Reservation = require("./models/Reservation"); // Adjust the path as needed
const Report = require("./models/Report"); // Adjust the path as needed
const connectDB = require("./config/db");

// Tunisian fake data
const tunisianNames = {
  firstNames: [
    "Mohamed",
    "Ahmed",
    "Sami",
    "Nour",
    "Youssef",
    "Amine",
    "Karim",
    "Rami",
    "Walid",
    "Houssem",
    "Sonia",
    "Mariem",
    "Nadia",
    "Fatma",
    "Salwa",
    "Amira",
    "Rania",
    "Samar",
    "Houda",
    "Leila",
  ],
  lastNames: [
    "Ben Ali",
    "Trabelsi",
    "Gharbi",
    "Jemali",
    "Sassi",
    "Bouazizi",
    "Kallel",
    "Haddad",
    "Cherif",
    "Brahmi",
    "Mnif",
    "Ouali",
    "Ben Youssef",
    "Ben Salem",
    "Ben Ammar",
    "Ben Jemia",
    "Ben Mustapha",
    "Ben Nasr",
    "Ben Othman",
    "Ben Hassen",
  ],
};

const tunisianCities = [
  "Tunis",
  "Sfax",
  "Sousse",
  "Kairouan",
  "Bizerte",
  "Gabès",
  "Ariana",
  "Gafsa",
  "Monastir",
  "Ben Arous",
  "Kasserine",
  "Médenine",
  "Nabeul",
  "Tataouine",
  "Béja",
  "Le Kef",
  "Mahdia",
  "Sidi Bouzid",
  "Jendouba",
  "Tozeur",
];
const tunisianAddresses = [
  "Avenue Habib Bourguiba",
  "Rue Charles de Gaulle",
  "Avenue Farhat Hached",
  "Rue de la République",
  "Avenue Mohamed V",
  "Rue Ibn Khaldoun",
  "Avenue Carthage",
  "Rue du Maroc",
  "Avenue de Paris",
  "Rue d'Allemagne",
];

const skills = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Masonry",
  "Tiling",
  "HVAC",
  "Appliance Repair",
  "Landscaping",
  "Cleaning",
];
const specializations = [
  "Home Repair",
  "Installation",
  "Maintenance",
  "Renovation",
  "Construction",
];
const serviceCategories = [
  "Home Services",
  "Repair",
  "Installation",
  "Maintenance",
  "Construction",
];
const serviceTitles = [
  "Kitchen Faucet Installation",
  "Bathroom Renovation",
  "Electrical Wiring Repair",
  "House Painting",
  "Floor Tiling",
  "Air Conditioning Installation",
  "Furniture Assembly",
  "Garden Landscaping",
  "Home Cleaning",
  "Appliance Repair",
];

const serviceDescriptions = [
  "Professional installation of kitchen faucets with warranty",
  "Complete bathroom renovation including tiles and fixtures",
  "Expert electrical wiring repair for homes and offices",
  "High-quality interior and exterior painting services",
  "Professional floor tiling for all room types",
  "Air conditioning unit installation and maintenance",
  "Furniture assembly for all types of flat-pack furniture",
  "Garden design and landscaping services",
  "Thorough home cleaning services",
  "Repair services for all home appliances",
];

const reviewComments = [
  "Excellent service, very professional!",
  "Great work, completed on time.",
  "Very satisfied with the quality of work.",
  "Professional and reliable service.",
  "Good value for money.",
  "Highly recommended!",
  "Work completed to a high standard.",
  "Very knowledgeable and skilled.",
  "Punctual and efficient service.",
  "Will definitely use again.",
];

const reportReasons = [
  "Unprofessional behavior",
  "Incomplete work",
  "Overcharging",
  "Late arrival",
  "Damaged property",
  "Poor communication",
  "Unsatisfactory quality",
  "Cancellation without notice",
  "Safety concerns",
  "Other issues",
];

async function seedTestData() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Worker.deleteMany({}),
      Service.deleteMany({}),
      Review.deleteMany({}),
      Report.deleteMany({}),
    ]);

    // Hash the password
    const hashedPassword = await bcrypt.hash("123456789aa", 10);

    // Create admin account
    const admin = new User({
      firstName: "Admin",
      lastName: "Account",
      email: "admin@yopmail.com",
      password: hashedPassword,
      phone: "20000000",
      role: "admin",
      adress: "Avenue Habib Bourguiba, Tunis",
      profileImage: "/profiles/profile.jpeg",
      status: "active",
      isProfileCompleted: true,
      firstTimeLogin: false,
    });
    await admin.save();
    console.log("Admin account created");

    // Create 10 clients
    const clients = [];
    for (let i = 0; i < 10; i++) {
      const firstName =
        tunisianNames.firstNames[
          Math.floor(Math.random() * tunisianNames.firstNames.length)
        ];
      const lastName =
        tunisianNames.lastNames[
          Math.floor(Math.random() * tunisianNames.lastNames.length)
        ];
      const city =
        tunisianCities[Math.floor(Math.random() * tunisianCities.length)];
      const address = `${Math.floor(Math.random() * 200) + 1} ${
        tunisianAddresses[Math.floor(Math.random() * tunisianAddresses.length)]
      }, ${city}`;
      const phone = `2${Math.floor(Math.random() * 9) + 1}${
        Math.floor(Math.random() * 9000000) + 1000000
      }`;

      const client = new User({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName
          .toLowerCase()
          .replace(" ", "")}${i}@yopmail.com`,
        password: hashedPassword,
        phone,
        profileImage: "/profiles/profile.jpeg",
        role: "user",
        adress: address,
        status: "active",
        isProfileCompleted: true,
        firstTimeLogin: false,
      });
      const savedClient = await client.save();
      clients.push(savedClient);
    }
    console.log("Created 10 clients");

    // Create 10 workers and their corresponding Worker documents
    const workers = [];
    for (let i = 0; i < 10; i++) {
      const firstName =
        tunisianNames.firstNames[
          Math.floor(Math.random() * tunisianNames.firstNames.length)
        ];
      const lastName =
        tunisianNames.lastNames[
          Math.floor(Math.random() * tunisianNames.lastNames.length)
        ];
      const city =
        tunisianCities[Math.floor(Math.random() * tunisianCities.length)];
      const address = `${Math.floor(Math.random() * 200) + 1} ${
        tunisianAddresses[Math.floor(Math.random() * tunisianAddresses.length)]
      }, ${city}`;
      const phone = `2${Math.floor(Math.random() * 9) + 1}${
        Math.floor(Math.random() * 9000000) + 1000000
      }`;

      const workerUser = new User({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName
          .toLowerCase()
          .replace(" ", "")}${i}@yopmail.com`,
        password: hashedPassword,
        phone,
        role: "worker",
        adress: address,
        status: "active",
        isProfileCompleted: true,
        firstTimeLogin: false,
      });
      const savedWorkerUser = await workerUser.save();

      // Create worker skills
      const workerSkills = [];
      const numSkills = Math.floor(Math.random() * 3) + 2; // 2-4 skills
      for (let j = 0; j < numSkills; j++) {
        const skill = skills[Math.floor(Math.random() * skills.length)];
        if (!workerSkills.includes(skill)) {
          workerSkills.push(skill);
        }
      }

      const worker = new Worker({
        user: savedWorkerUser._id,
        skills: workerSkills,
        experience: Math.floor(Math.random() * 15) + 1, // 1-15 years
        specialization:
          specializations[Math.floor(Math.random() * specializations.length)],
        availability: Math.random() > 0.2, // 80% chance of being available
        subscription: {
          plan: ["FreeTrial", "basicPlan", "ProPlan", "premiumPlan"][
            Math.floor(Math.random() * 4)
          ],
          startDate: new Date(
            Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000
          ), // Random date within the last year
          endDate: new Date(
            Date.now() + Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000
          ), // Random date within the next year
          isActive: Math.random() > 0.3, // 70% chance of being active
        },
        freeTrialInfo: {
          hasUsed: Math.random() > 0.5, // 50% chance of having used free trial
          lastUsed:
            Math.random() > 0.5
              ? new Date(
                  Date.now() -
                    Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000
                )
              : undefined,
          expirationDate:
            Math.random() > 0.5
              ? new Date(
                  Date.now() +
                    Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
                )
              : undefined,
        },
      });
      const savedWorker = await worker.save();
      workers.push(savedWorker);
    }
    console.log("Created 10 workers");

    // Create services for each worker (5 services per worker)
    const services = [];
    for (const worker of workers) {
      for (let i = 0; i < 5; i++) {
        const serviceIndex = Math.floor(Math.random() * serviceTitles.length);
        const service = new Service({
          title: serviceTitles[serviceIndex],
          description: serviceDescriptions[serviceIndex],
          price: Math.floor(Math.random() * 900) + 100, // 100-1000
          worker: worker._id,
          category:
            serviceCategories[
              Math.floor(Math.random() * serviceCategories.length)
            ],
          images: ["/service/service.jpeg"],
          location:
            tunisianCities[Math.floor(Math.random() * tunisianCities.length)],
          videos:
            Math.random() > 0.7
              ? [`/video${Math.floor(Math.random() * 50)}.mp4`]
              : [],
          audience: Math.random() > 0.8 ? "private" : "public",
        });
        const savedService = await service.save();
        services.push(savedService);
      }
    }
    console.log("Created services for workers");

    // Create reviews
    const reviews = [];
    for (let i = 0; i < 30; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const worker = workers[Math.floor(Math.random() * workers.length)];
      const service = services.filter(
        (s) => s.worker.toString() === worker._id.toString()
      )[0];
      if (service) {
        const review = new Review({
          user: client._id,
          worker: worker._id,
          service: service._id,
          rating: Math.floor(Math.random() * 5) + 1, // 1-5
          comment:
            reviewComments[Math.floor(Math.random() * reviewComments.length)],
        });
        const savedReview = await review.save();
        reviews.push(savedReview);
      }
    }
    console.log("Created reviews");

    // Create reports
    const reports = [];
    for (let i = 0; i < 10; i++) {
      const reporter = clients[Math.floor(Math.random() * clients.length)];
      const worker = workers[Math.floor(Math.random() * workers.length)];
      const reportedUser = await User.findById(worker.user);
      const report = new Report({
        reporter: reporter._id,
        reportedUser: reportedUser._id,
        reason: reportReasons[Math.floor(Math.random() * reportReasons.length)],
        status: ["pending", "reviewed", "resolved"][
          Math.floor(Math.random() * 3)
        ],
      });
      const savedReport = await report.save();
      reports.push(savedReport);
    }
    console.log("Created reports");

    console.log("Test data seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding test data:", error);
    process.exit(1);
  }
}

seedTestData();
